import { stripIndent } from 'common-tags';
import type { driveactivity_v2, people_v1 } from 'googleapis';
import moment from 'moment-timezone';
import { ignoredActions, japaneseTranslations, colors, ActionName } from './config';
import type { Clients } from './lib';
import type { DriveItem } from './drive-activity-api';
import { getDriveItem } from './drive-activity-api';
import type { SentChannel } from './drive-api';
import { envvar } from '@/lib/envvar';

const getActionName = (actionDetail: driveactivity_v2.Schema$ActionDetail): ActionName =>
  Object.keys(actionDetail)[0] as ActionName;

const formatDate = (timestamp: string): string =>
  moment(timestamp).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss');

const getDate = (activity: driveactivity_v2.Schema$DriveActivity): string => {
  if (activity.timestamp) {
    return formatDate(activity.timestamp);
  } else if (activity.timeRange) {
    return `${formatDate(activity.timeRange.startTime!)} - ${formatDate(activity.timeRange.endTime!)}`;
  } else {
    throw Error('This code should be unreachable.');
  }
};

export const isActivityByBot = (activity: driveactivity_v2.Schema$DriveActivity, groupEmailAddress: string): boolean => {
  // bot activity might be part of activity by ordinary user
  // but I'll think about that after it really occurres.
  // currently this returns true if the activity only contains adding permission by bot
  if (activity.actors!.length !== 1) {
    return false;
  }
  if (!activity.actors![0].user?.knownUser?.isCurrentUser) {
    return false;
  }
  // use primaryAction, not actions because it somehow contains edit
  const detail = activity.primaryActionDetail;
  if (!detail!.permissionChange?.addedPermissions) {
    return false;
  }
  return detail!.permissionChange.addedPermissions.every(permission =>
    permission.role === 'COMMENTER' && permission.group?.email === groupEmailAddress);
};


// TODO: use batchGet https://developers.google.com/people/api/rest/v1/people/getBatchGet
// もしくはpersonNameと名前との紐付けDBを作る (あんまり変化しなさそうなので)
const getPersonName = async (_client: people_v1.People, resourceName: string): Promise<string> => {
  // const person: people_v1.Schema$Person = (await client.people.get({ resourceName, personFields: 'names' })).data;
  // const name = person.names?.[0]?.displayName;
  // return name ?? resourceName; // TODO: a better approach?
  return resourceName;
};

const getEmoji = (mimeType: string): string => {
  switch (mimeType) {
    case 'application/vnd.google-apps.folder':
      return ':file_folder:';
    default:
      return ':file:';
  }
};

export const notifyToSlack = async ({ slack, drive, people: peopleAPI }: Clients, activity: driveactivity_v2.Schema$DriveActivity, groupEmailAddress: string) => {
  // not notified in order!
  // maybe chat.scheduleMessage is useful to imitate notification in order
  // but I think the inorderness is ignorable if the frequency of execution is high enough
  const actionName = getActionName(activity.primaryActionDetail!);
  if (ignoredActions.includes(actionName)) {
    return;
  }
  if (isActivityByBot(activity, groupEmailAddress)) {
    return;
  }
  const items: DriveItem[] = (
    await Promise.all(
      activity.targets!
        .map(async target => await getDriveItem(drive, target)),

    )
  ).filter(({ sentChannel }) => sentChannel !== 'none');
  if (items.length === 0) {
    return;
  }
  const actorsText = (await Promise.all(
    activity.actors!.map(async actor => `${await getPersonName(peopleAPI, actor.user!.knownUser!.personName!)}  さん`),
  )).join(', ');
  const send = async ([sentChannel, channelId]: readonly [SentChannel, string]) => {
    const sentItems = items.filter(({ sentChannel: c }) => c === sentChannel);
    if (sentItems.length === 0) {
      return;
    }
    const text = stripIndent`
            ${actorsText}が *${sentItems.length}* 件のアイテムを *${japaneseTranslations[actionName]}* しました。
            発生日時: ${getDate(activity)}
        `;
    if (sentItems.length <= 20) {
      // attachments
      const attachments = await Promise.all(sentItems.map(async item => ({
        color: colors[actionName],
        title: `${japaneseTranslations[actionName]}: ${getEmoji(item.mimeType)} ${await item.getPath(drive)}`,
        text: '', // TODO: include details
        title_link: item.link!,
      })));
      await slack.chat.postMessage({
        channel: channelId,
        text,
        icon_emoji: ':google_drive:',
        username: 'UpdateNotifier',
        attachments,
      });
    } else {
      // post snippet
      await slack.files.upload({
        channels: [await envvar.get('slack/channel/notify-drive')].join(','),
        content: (await Promise.all(sentItems.map(
          async item => `${japaneseTranslations[actionName]}: ${await item.getPath(drive)} (${item.link})`,
        ))).join('\n'),
        initial_comment: text,
      });
    }
  };

  await Promise.all(
    ([
      ['main', await envvar.get('slack/channel/notify-drive')],
      ['lms', await envvar.get('slack/channel/notify-drive-lms')]
    ] as const)
      .map(send)
  );
};
