import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import { listMessages } from '@/lib/slack/web/message';
import type { ScheduledHandler } from 'aws-lambda';
import { storage } from '../common/storage';

export const handler: ScheduledHandler = async () => {
  await main();
};

export const main = async (): Promise<void> => {
  const state = await storage.get();

  if (state.none) {
    console.log('Sandbox is not logged yet. Skippping cleaning.');
    return;
  }

  await cleanupSandbox(state.val.lastDumpedTimeStamp);
};

// TODO: Queueでよくないか

const cleanupSandbox = async (lastDumpedTimeStamp: string): Promise<void> => {
  const sandboxId = await envvar.get('slack/channel/sandbox');
  const messages = (await listMessages(
    {
      channel: sandboxId,
      latest: lastDumpedTimeStamp,
      inclusive: true,
      limit: 40, // to avoid rate limit
      threadPolicy: 'all-or-nothing',
    },
  )).filter(({ subtype }) => subtype !== 'tombstone');

  await Promise.all(messages
    // eslint-disable-next-line @typescript-eslint/naming-convention
    .filter(({ pinned_to }) => !pinned_to?.includes(sandboxId))
    .map(async message => await (await slack.admin()).chat.delete({
      channel: sandboxId,
      ts: message.ts,
      as_user: true,
    })));
};

// (async () => {
//     const start = Date.now();
//     await cleanupSandbox({lastDumped: {ts: '1234567890.000000'}});
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })().catch(console.error);
