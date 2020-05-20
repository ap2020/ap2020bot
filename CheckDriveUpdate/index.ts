import {AzureFunction, Context} from "@azure/functions"
import {google, driveactivity_v2, people_v1, drive_v3} from 'googleapis';
import {getGoogleClient} from '../utils/google-client';
import {flatten} from 'lodash';
import {slack} from '../utils/slack/clients';
import {fetchDriveItem} from './drive-api';
import {Clients, rootFolderId, getDriveItemId} from './lib';
import {notifyToSlack} from './notify-to-slack';

// import {promises as fs} from 'fs';
// import path from 'path';

const main: AzureFunction = async (context: Context, timer: any, lastDate: {ts: number},): Promise<{ts: number}> => {
    return {ts: (await checkUpdate(context, new Date(lastDate.ts))).getTime()};
};

export default main;

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
        if (response.activities !== undefined) {
            activities = activities.concat(response.activities);
        }
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
    
const addCommentPermission = async ({drive}: Clients, activity: driveactivity_v2.Schema$DriveActivity, groupEmailAddress) => {
    await Promise.all(activity.actions.filter(({detail}) => detail.create).filter(({target}) => target.driveItem?.driveFile).map(async ({target}) => {
        const item = await fetchDriveItem(drive, getDriveItemId(target));
        if (!item.content.permissions) {
            // the user don't have permission to share this file
            return;
        }
        if(item.content.mimeType === 'application/vnd.google-apps.folder') {
            // item is a folder so adding comment permission does nothing
            return;
        }
        const commentables = ["owner", "writer", "commenter"];
        const groupPermission = item.content.permissions.find(
            ({type, emailAddress}) => type === 'group' && emailAddress === groupEmailAddress
        );
        const anyonePermission = item.content.permissions.find(
            ({type}) => type === 'anyone'
        );
        if (commentables.includes(groupPermission?.role)) {
            // group already has permission
            return;
        }
        if (commentables.includes(anyonePermission?.role)) {
            // anyone already has permission
            return;
        }

        await drive.permissions.create({
            fileId: item.content.id,
            sendNotificationEmail: false,
            requestBody: {
                role: 'commenter',
                type: 'group',
                emailAddress: groupEmailAddress,
            }
        });
    }));
}

const fillEmptyTarget = (context: Context, activity: driveactivity_v2.Schema$DriveActivity): driveactivity_v2.Schema$DriveActivity => {
    if (activity.targets.length > 1) {
        return activity;
    }
    if (activity.targets.length === 0) {
        context.log.error('empty targets', activity.timestamp ?? activity.timeRange);
        return activity;
    }
    const mainTarget = activity.targets[0];
    return {
        ...activity,
        actions: activity.actions.map(action => {
            if (action.target) return action;
            return {
                ...action,
                target: mainTarget,
            }
        }),
    }
} 

const checkUpdate = async (context: Context, since: Date): Promise<Date> => {
    const auth = getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const driveActivity = google.driveactivity({version: "v2", auth});
    const peopleAPI = google.people({version: 'v1', auth});
    const drivelogId = process.env.SLACK_CHANNEL_DRIVE;
    const groupEmailAddress = process.env.GOOGLE_GROUPS_EMAIL_ADDRESS;
    const clients: Clients = {
        slack,
        drive,
        driveActivity,
        people: peopleAPI,
    }

    const lastChecked = new Date();
    const activities = (await fetchAllDriveActivities(driveActivity, rootFolderId, since)).map(activity => fillEmptyTarget(context, activity));
    const hooks: ((activity: driveactivity_v2.Schema$DriveActivity) =>  unknown)[] = [
        async (activity) => await notifyToSlack(clients, activity, drivelogId, groupEmailAddress),
        async (activity) => await addCommentPermission(clients, activity, groupEmailAddress),
    ]
    await Promise.all(
        flatten(
            activities
                .reverse()
                .map(activity => (
                    hooks.map(async hook => await hook(activity))
                ))
        )
    );
    return lastChecked;
}

// import {context} from '../utils-dev/fake-context';
// (async () => {
//     const start = Date.now();
//     await checkUpdate(context, new Date(Date.now() - 1000*60*60*24));
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })().catch(console.error);
