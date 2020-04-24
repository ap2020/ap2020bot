import {AzureFunction, Context} from "@azure/functions"
import {google, driveactivity_v2} from 'googleapis';
import {getGoogleClient} from '../utils/google-client';
import {ignoredActions} from './config';

const main: AzureFunction = async (context: Context, myTimer: any): Promise<void> => {
    // await checkUpdate();
};

export default main;

const fetchAllDriveActivities = async (
    driveActivity: driveactivity_v2.Driveactivity,
    since: Date,
): Promise<driveactivity_v2.Schema$DriveActivity[]> => {
    // may take a while. 
    const root_folder_id = process.env.GOOGLE_ROOT_FOLDER_ID;
    let activities: driveactivity_v2.Schema$DriveActivity[] = [];
    let response: driveactivity_v2.Schema$QueryDriveActivityResponse | null = null;
    
    do {
        response = (await driveActivity.activity.query({
            requestBody: {
                ancestorName: `items/${root_folder_id}`,
                filter: `time > ${since.getTime()}`,
                pageToken: response?.nextPageToken,
                consolidationStrategy: { legacy: {} }
            }
        })).data;
        activities = activities.concat(response.activities);
    } while (response.nextPageToken);
    
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

const checkUpdate = async (since: Date) => {
    const auth = getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    //console.log(await drive.files.list({pageSize: 3}));
    const driveActivity = google.driveactivity({version: "v2", auth});
    
    const lastChecked = Date.now();
    const activities = await fetchAllDriveActivities(driveActivity, since);
    for (const activity of activities) {
        if (!activity) continue;
        const actionName = getActionName(activity.primaryActionDetail);
        if (ignoredActions.indexOf(actionName) !== -1) {
            continue;
        }
    }
}
