import { TinyStorage } from '@/lib/aws/dynamodb/default';
import { envvar } from '@/lib/envvar';
import { googleAuth } from '@/lib/google';
import { slack } from '@/lib/slack/client';
import type { ScheduledHandler } from 'aws-lambda';
import type { driveactivity_v2 } from 'googleapis';
import { google } from 'googleapis';
import { fetchDriveItem } from './drive-api';
import type { Clients } from './lib';
import { getDriveItemId } from './lib';
import { notifyToSlack } from './notify-to-slack';


const fetchAllDriveActivitiesRec = async(
  driveActivity: driveactivity_v2.Driveactivity,
  folderId: string,
  since: Date,
  pageToken: string | null,
): Promise<driveactivity_v2.Schema$DriveActivity[]> => {
  const response = (await driveActivity.activity.query({
    requestBody: {
      ancestorName: `items/${folderId}`,
      filter: `time > ${since.getTime()}`,
      ...pageToken ? { pageToken } : {},
      consolidationStrategy: { legacy: {} },
    },
  })).data;

  const activities = response.activities ?? []

  return response.nextPageToken ?
    [...activities, ...await fetchAllDriveActivitiesRec(driveActivity, folderId, since, response.nextPageToken)] :
    activities;
}

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
  const activities = await fetchAllDriveActivitiesRec(driveActivity, folderId, since, null);

  // if (process.env.NODE_ENV === 'development') {
  //     try {
  //         await fs.writeFile(path.join(__dirname, '..', 'tmp', 'drive-activity-api-cache.json'), JSON.stringify(activities));
  //     } catch (e) {
  //         console.error('Error while caching API response', e);
  //     }
  // }

  return activities;
};


const addCommentPermission = async ({ drive }: Clients, activity: driveactivity_v2.Schema$DriveActivity, groupEmailAddress: string) => {
  await Promise.all((activity!.actions!.filter(({ detail }) => detail!.create)!).filter(({ target }) => target!.driveItem?.driveFile).map(async ({ target }) => {
    const item = await fetchDriveItem(drive, getDriveItemId(target!));
    if (!item.content.permissions) {
      // the user don't have permission to share this file
      return;
    }
    if (item.content.mimeType === 'application/vnd.google-apps.folder') {
      // item is a folder so adding comment permission does nothing
      return;
    }
    const commentables = new Set(['owner', 'writer', 'commenter']);
    const groupPermission = item.content.permissions.find(
      ({ type, emailAddress }) => type === 'group' && emailAddress === groupEmailAddress,
    );
    const anyonePermission = item.content.permissions.find(
      ({ type }) => type === 'anyone',
    );
    if (commentables.has(groupPermission?.role!)) {
      // group already has permission
      return;
    }
    if (commentables.has(anyonePermission?.role!)) {
      // anyone already has permission
      return;
    }

    await drive.permissions.create({
      fileId: item.content.id!,
      sendNotificationEmail: false,
      requestBody: {
        role: 'commenter',
        type: 'group',
        emailAddress: groupEmailAddress,
      },
    });
  }));
};

const fillEmptyTarget = (activity: driveactivity_v2.Schema$DriveActivity): driveactivity_v2.Schema$DriveActivity => {
  if (activity.targets!.length > 1) {
    return activity;
  }
  if (activity.targets!.length === 0) {
    console.error('empty targets', activity.timestamp ?? activity.timeRange);
    return activity;
  }
  const mainTarget = activity.targets![0];
  return {
    ...activity,
    actions: activity.actions!.map(action => {
      if (action.target) return action;
      return {
        ...action,
        target: mainTarget,
      };
    }),
  };
};

const checkUpdate = async (since: Date): Promise<Date> => {
  const auth = await googleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const driveActivity = google.driveactivity({ version: 'v2', auth });
  const peopleAPI = google.people({ version: 'v1', auth });
  const groupEmailAddress = await envvar.get('google/group/ap2020');
  const clients: Clients = {
    slack: await slack.bot,
    drive,
    driveActivity,
    people: peopleAPI,
  };

  const lastChecked = new Date();
  const activities = (await fetchAllDriveActivities(driveActivity, await envvar.get('google/drive/item/ap2020files'), since)).map(activity => fillEmptyTarget(activity));
  const hooks: ((activity: driveactivity_v2.Schema$DriveActivity) => unknown)[] = [
    async (activity) => await notifyToSlack(clients, activity, groupEmailAddress),
    async (activity) => await addCommentPermission(clients, activity, groupEmailAddress),
  ];
  await Promise.all(
    activities
      .reverse()
      .flatMap(activity => (
        hooks.map(async hook => await hook(activity))
      )),
  );
  return lastChecked;
};

type StorageContent = {
  lastChecked: number;
};

export const main = async (): Promise<void> => {
  const storage = new TinyStorage<StorageContent>('watch-drive');

  const state = await storage.get();

  if (!state.some) {
    throw new Error('state is not set.');
  }
  const lastChecked = new Date(state.val.lastChecked);

  const newLastChecked = await checkUpdate(lastChecked);

  await storage.set({ lastChecked: newLastChecked.getTime() } );
  // TODO: save
};

export const handler: ScheduledHandler = async () => {
  await main();
};
