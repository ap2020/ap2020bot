import {AzureFunction, Context} from "@azure/functions"
import {google, driveactivity_v2, people_v1, drive_v3} from 'googleapis';
import {getGoogleClient} from '../utils/google-client';
import {ignoredActions, japaneseTranslations, colors} from './config';
import {stripIndent} from 'common-tags';
import moment from 'moment-timezone';
import {slack} from '../utils/slack';
import {fetchDriveItem, DriveItem} from './drive-api';
import {cacheCalls} from '../utils/utils';

// import {promises as fs} from 'fs';
// import path from 'path';

const main: AzureFunction = async (context: Context, timer: any, lastDate: {ts: number},): Promise<{ts: number}> => {
    return {ts: (await checkUpdate(new Date(lastDate.ts))).getTime()};
};

export default main;

const rootFolderId = process.env.GOOGLE_ROOT_FOLDER_ID;

const fetchAllDriveActivities = async (
    driveActivity: driveactivity_v2.Driveactivity,
    folderId: string,
    since: Date,
): Promise<driveactivity_v2.Schema$DriveActivity[]> => {

    // if (process.env.NODE_ENV === 'development') {
    //     try {
    //         return JSON.parse(await fs.readFile(path.join(__dirname, '..', 'tmp', 'drive-activity-api-cache.json'), {encoding: 'utf-8'}));
    //     } catch (e) {
    //         console.warn('Failed to load cache.\nFetching...')
    //     }
    // }

    // may take a while. 
    let activities: driveactivity_v2.Schema$DriveActivity[] = [];
    let response: driveactivity_v2.Schema$QueryDriveActivityResponse | null = null;
    
    do {
        response = (await driveActivity.activity.query({
            requestBody: {
                ancestorName: `items/${folderId}`,
                filter: `time > ${since.getTime()}`,
                pageToken: response?.nextPageToken,
                consolidationStrategy: { legacy: {} }
            }
        })).data;
        activities = activities.concat(response.activities);
    } while (response.nextPageToken);
    
    // if (process.env.NODE_ENV === 'development') {
    //     try {
    //         await fs.writeFile(path.join(__dirname, '..', 'tmp', 'drive-activity-api-cache.json'), JSON.stringify(activities));
    //     } catch (e) {
    //         console.error('Error while caching API response', e);
    //     }
    // }

    return activities;
};
    
const getActionName = (actionDetail: driveactivity_v2.Schema$ActionDetail): string =>
Object.keys(actionDetail)[0];

const getTargetName = (target: driveactivity_v2.Schema$Target): string => {
    if (target.driveItem) return target.driveItem.title;
    else if (target.drive) return target.drive.title;
    else if (target.fileComment) return target.fileComment.parent.title;
    // else {
    //     const _exhaustiveCheck: never = target;
    //     return _exhaustiveCheck;
    // }
    // Target is not union...
};

// TODO: use batchGet https://developers.google.com/people/api/rest/v1/people/getBatchGet
const getPersonName = async (client: people_v1.People, resourceName: string): Promise<string> => {
    const person: people_v1.Schema$Person = (await client.people.get({resourceName, personFields: 'names' })).data;
    const name = person.names?.[0]?.displayName;
    return name ?? resourceName; // TODO: a better approach?
};

const formatDate = (timestamp: string): string =>
    moment(timestamp).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss');

const getDate = (activity: driveactivity_v2.Schema$DriveActivity): string => {
    if (activity.timestamp) {
        return formatDate(activity.timestamp);
    } else if (activity.timeRange) {
        return `${formatDate(activity.timeRange.startTime)} - ${formatDate(activity.timeRange.endTime)}`
    }
};

const getDriveItemId = (target: driveactivity_v2.Schema$Target): string => {
    let itemName: string;
    if (target.driveItem) itemName = target.driveItem.name;
    else if (target.drive) itemName = target.drive.name;
    else if (target.fileComment) itemName = target.fileComment.parent.name;
    // else {
    //   const _exhaustiveCheck: never = target;
    //   itemName = _exhaustiveCheck;
    // }
    return itemName.replace(/^items\//, '');
};

/**
 * cache for getPath
 * folderId => path
 */
const paths: Map<string, Promise<{path: string | null, valid: boolean}>> = new Map([[rootFolderId, Promise.resolve({path: '/', valid: true})]]);
const getPath = async (client: drive_v3.Drive, item: DriveItem): Promise<string> => {
    /**
     * path: path to item
     * valid: true if path has rootFolderId in ancestor
     */
    const rec = cacheCalls(async (client: drive_v3.Drive, folderId: string): Promise<{path: string | null; valid: boolean}> => {
        const folder = await fetchDriveItem(client, folderId);
        if (!folder.content.parents) {
            // folder is root of drive
            return { path: null, valid: false };
        }
        // I want to use Promise.any...
        const parentPaths = (
            (await Promise.all(folder.content.parents.map(async parentId => rec(client, parentId))))
            .filter(({valid}) => valid).map(({path}) => path)
        );
        if (parentPaths.length > 0) {
            const isFolder = folder.content.mimeType === 'application/vnd.google-apps.folder';
            // folder has one or more parents that is child of rootFolderId
            return { path: `${parentPaths[0]}${folder.content.name}${isFolder? '/': ''}`, valid: true };
        } else {
            // rootFolderId is not ancestor of folderId...
            return { path: null, valid: false };
        }
    }, (c, id) => id, paths);
    const path = await rec(client, item.content.id);
    return path.valid? path.path: item.content.name;
};

const getEmoji = (item: DriveItem): string => {
    switch (item.content.mimeType) {
        case 'application/vnd.google-apps.folder':
            return ':file_folder:';
        default:
            return ':file:';
    }
};

const checkUpdate = async (since: Date): Promise<Date> => {
    const auth = getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const driveActivity = google.driveactivity({version: "v2", auth});
    const peopleAPI = google.people({version: 'v1', auth});
    const drivelogId = process.env.SLACK_CHANNEL_DRIVE;

    const lastChecked = new Date();
    const activities = await fetchAllDriveActivities(driveActivity, rootFolderId, since);
    await Promise.all(activities.reverse().map(async activity => {
        // not notified in order!
        // maybe chat.scheduleMessage is useful to imitate notification in order
        // but I think the inorderness is ignorable if the frequency of execution is high enough
        if (!activity) {
            return;
        };
        const actionName = getActionName(activity.primaryActionDetail);
        if (ignoredActions.includes(actionName)) {
            return;
        }
        const targets: driveactivity_v2.Schema$Target[] = activity.targets/*.filter(
            target => !isIgnoredItem(getDriveItemfromTarget(target))
        )*/; // TODO
        if (targets.length === 0) {
            return;
        }
        const actorsText = (await Promise.all(
            activity.actors.map(async actor => `${await getPersonName(peopleAPI, actor.user.knownUser.personName)}  さん`)
        )).join(', ');
        const text = stripIndent`
            ${actorsText}が *${activity.targets.length}* 件のアイテムを *${japaneseTranslations[actionName]}* しました。
            発生日時: ${getDate(activity)}
        `;
        let fileURL: string | undefined = undefined;
        if (targets.length <= 20) {
            // attachments
            const attachments = await Promise.all(targets.map(async target => {
              const item = await fetchDriveItem(drive, getDriveItemId(target));
              return {
                color: colors[actionName],
                title: `${japaneseTranslations[actionName]}: ${getEmoji(item)} ${await getPath(drive, item)}`,
                text: '', // TODO: include details
                title_link: item.content.webViewLink
              };
            }));
            await slack.bot.chat.postMessage({
                channel: drivelogId,
                text, 
                icon_emoji: ':google_drive:',
                username: 'UpdateNotifier',
                attachments: attachments,
            });
        } else {
            // snippet
            fileURL = ((await slack.bot.files.upload({
                channels: [drivelogId].join(','),
                content: (await Promise.all(targets.map(
                    async target => {
                        const item = await fetchDriveItem(drive, getDriveItemId(target));
                        return `${japaneseTranslations[actionName]}: ${await getPath(drive, item)} (${item.content.webViewLink})`
                    },
                    ))).join('\n'),
                text,
            })) as any).file.permalink;
            // TODO: not checked!
        }
    }));
    return lastChecked;
}

// (async () => {
//     const start = Date.now();
//     await checkUpdate(new Date(Date.now() - 1000*60*60*24));
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })();
