import type { drive_v3 } from 'googleapis';
import { google } from 'googleapis';
import { listMessages } from '@/lib/slack/web/message';
import { datetimeToSlackTS, slackTSToDateTime } from '@/lib/slack/timestamp';
import { googleAuth } from '@/lib/google';
import { ScheduledHandler } from 'aws-lambda';
import { storage } from '../common/storage';
import { DateTime, Duration } from 'luxon';
import { Conversation } from '@/lib/slack/web/types';

export const handler: ScheduledHandler = async () => {
  await main();
}

const main = async (): Promise<void> => {
  const state = await storage.get();

  if (state.none) {
    throw new Error('sandbox-keeper state is not set.');
  }

  const newLastDumpedTimeStamp = await dumpSandbox(state.val.lastDumpedTimeStamp);

  await storage.set({ lastDumpedTimeStamp: newLastDumpedTimeStamp });
};

const dumpSandbox = async (lastDumpedTimeStamp: string): Promise<string> => {
  const sandboxId = process.env.SLACK_CHANNEL_SANDBOX!; // TODO: use ssm
  const dumpFolderId = process.env.GOOGLE_FOLDER_SANDBOX_DUMP_ID!;
  const auth = await googleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const deleteAfter = Duration.fromObject({ days: 1 });
  const latestOldTS = datetimeToSlackTS(DateTime.now().minus(deleteAfter)); // latest timestamp that should be cleaned
  const messages = (await listMessages({
    channel: sandboxId,
    oldest: lastDumpedTimeStamp,
    latest: latestOldTS,
    threadPolicy: 'just-in-range',
    /* inclusive: false */
  }));
    // inclusive: false doesn't work (because of Slack?) but default is false so just leave it empty
  if (messages.length === 0) {
    return lastDumpedTimeStamp;
  } else {
    const newLastDumpedMessage = messages[messages.length - 1];
    await dumpMessages(drive, messages, dumpFolderId, lastDumpedTimeStamp.ts, newLastDumpedMessage.ts);
    return newLastDumpedMessage;
  }
};

const createFolderIfMissing = async (drive: drive_v3.Drive, parentId: string, name: string): Promise<drive_v3.Schema$File> => {
  const searchResult: drive_v3.Schema$File[] = (await drive.files.list({
    q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder'`, // TODO: injection!
  })).data.files!;
  if (searchResult.length === 0) {
    // not found, so create folder
    const folder = (await drive.files.create({
      requestBody: {
        name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    })).data;
    return folder;
  } else {
    if (searchResult.length > 1) {
      console.error('More than one folder named', name, searchResult.map(({ id }) => id));
      // まあでも致命的ではないのでとりあえずそのまま実行
    }
    return searchResult[0];
  }
};

const dumpMessages = async (drive: drive_v3.Drive, messages: Conversation.Message[], dumpFolderId: string, oldestTS: string, latestTS: string) => {
  const oldest = slackTSToDateTime(oldestTS);
  const latest = slackTSToDateTime(latestTS);
  const dump = JSON.stringify(messages);

  const ymfolder = await createFolderIfMissing(drive, dumpFolderId, oldest.toFormat('yyyy-MM'));
  const dayfolder = await createFolderIfMissing(drive, ymfolder.id!, oldest.toFormat('dd'));

  await drive.files.create({
    requestBody: {
      name: `sandbox-dump-${oldest.toFormat('yyyyMMdd-HHmmss')}-${latest.toFormat('yyyyMMdd-HHmmss')}.json`,
      mimeType: 'application/json',
      parents: [dayfolder.id!],
    },
    media: {
      mimeType: 'application/json',
      body: dump,
    },
  });
};

// import { context } from '../utils-dev/fake-context';
// (async () => {
//     const start = Date.now();
//     await dumpSandbox({ts: '1234567890.000000'}, context);
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })().catch(console.error);
