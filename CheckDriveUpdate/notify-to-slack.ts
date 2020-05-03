import {stripIndent} from 'common-tags';
import type {driveactivity_v2, people_v1, drive_v3} from 'googleapis';
import moment from 'moment-timezone';
import {ignoredActions, japaneseTranslations, colors} from './config';
import {cacheCalls} from '../utils/utils';
import {Clients, rootFolderId, getDriveItemId} from './lib';
import {fetchDriveItem, DriveItem, getPath} from './drive-api';

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

const formatDate = (timestamp: string): string =>
    moment(timestamp).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss');

const getDate = (activity: driveactivity_v2.Schema$DriveActivity): string => {
    if (activity.timestamp) {
        return formatDate(activity.timestamp);
    } else if (activity.timeRange) {
        return `${formatDate(activity.timeRange.startTime)} - ${formatDate(activity.timeRange.endTime)}`
    }
};

const isIgnored = cacheCalls(async (client: drive_v3.Drive, itemId: string): Promise<boolean> => {
    const item = await fetchDriveItem(client, itemId);
    if (item.content.parents.length === 0) {
        // we don't need to ignore this
        return false;
    }
    const isParentsIgnored = await Promise.all(item.content.parents.map(async parentId => isIgnored(client, parentId)));
    // 全ての親がignoredならtrue
    return isParentsIgnored.every((x) => x);
}, (c, id) => id, new Map([
    ...((process.env.GOOGLE_DRIVE_IGNORED_IDS ?? '').split(',').map(s => [s.trim(), Promise.resolve(true)] as [string, Promise<boolean>])),
    [rootFolderId, Promise.resolve(false)],
]));

export const isActivityByBot = (activity: driveactivity_v2.Schema$DriveActivity, groupEmailAddress: string): boolean => {
    // bot activity might be part of activity by ordinary user
    // but I'll think about that after it really occurres.
    // currently this returns true if the activity only contains adding permission by bot
    if (activity.actors.length !== 1) {
        return false;
    }
    if (!activity.actors[0].user?.knownUser?.isCurrentUser) {
        return false
    }
    // use primaryAction, not actions because it somehow contains edit
    const detail = activity.primaryActionDetail;
    if (!detail.permissionChange?.addedPermissions) {
        return false;
    }
    return detail.permissionChange.addedPermissions.every(permission =>
        permission.role === "COMMENTER" && permission.group?.email === groupEmailAddress
    )
}


// TODO: use batchGet https://developers.google.com/people/api/rest/v1/people/getBatchGet
const getPersonName = async (client: people_v1.People, resourceName: string): Promise<string> => {
    const person: people_v1.Schema$Person = (await client.people.get({resourceName, personFields: 'names' })).data;
    const name = person.names?.[0]?.displayName;
    return name ?? resourceName; // TODO: a better approach?
};

const getEmoji = (item: DriveItem): string => {
    switch (item.content.mimeType) {
        case 'application/vnd.google-apps.folder':
            return ':file_folder:';
        default:
            return ':file:';
    }
};

export const notifyToSlack = async ({slack, drive, people: peopleAPI}: Clients, activity: driveactivity_v2.Schema$DriveActivity, drivelogId: string, groupEmailAddress: string) => {
    // not notified in order!
    // maybe chat.scheduleMessage is useful to imitate notification in order
    // but I think the inorderness is ignorable if the frequency of execution is high enough
    const actionName = getActionName(activity.primaryActionDetail);
    if (ignoredActions.includes(actionName)) {
        return;
    }
    if (isActivityByBot(activity, groupEmailAddress)) {
        return;
    }
    const targets: driveactivity_v2.Schema$Target[] = (
        (await Promise.all(activity.targets.map(
            async target => ({target, ignored: await isIgnored(drive, getDriveItemId(target))})
        )))
        .filter(({ignored}) => !ignored)
        .map(({target}) => target)
    );
    if (targets.length === 0) {
        return;
    }
    const actorsText = (await Promise.all(
        activity.actors.map(async actor => `${await getPersonName(peopleAPI, actor.user.knownUser.personName)}  さん`)
    )).join(', ');
    const text = stripIndent`
        ${actorsText}が *${targets.length}* 件のアイテムを *${japaneseTranslations[actionName]}* しました。
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
        // post snippet
        fileURL = ((await slack.bot.files.upload({
            channels: [drivelogId].join(','),
            content: (await Promise.all(targets.map(
                async target => {
                    const item = await fetchDriveItem(drive, getDriveItemId(target));
                    return `${japaneseTranslations[actionName]}: ${await getPath(drive, item)} (${item.content.webViewLink})`
                },
                ))).join('\n'),
            initial_comment: text,
        })) as any).file.permalink;
    }
}
