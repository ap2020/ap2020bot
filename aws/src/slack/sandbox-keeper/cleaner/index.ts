import { slack } from '@/lib/slack/client';
import { listMessages } from '../utils/slack/message';
import type { LastDumpedMessage } from '../DumpSandbox/output';
import { ScheduledHandler } from 'aws-lambda';

export const main = async (): Promise<void> => {

}

export const handler: ScheduledHandler = async () => {
  await main();
  await cleanupSandbox(lastDumpedMessage);
};



// TODO: Queueでよくないか

const cleanupSandbox = async (lastDumped: LastDumpedMessage): Promise<void> => {
  const sandboxId = process.env.SLACK_CHANNEL_SANDBOX;
  const messages = (await listMessages(
    {
      channel: sandboxId,
      latest: lastDumped.ts,
      inclusive: true,
      limit: 40, // to avoid rate limit
      threadPolicy: 'all-or-nothing',
    },
  )
  ).filter(({ subtype }) => subtype !== 'tombstone');
  await Promise.all(messages
    .filter(({ pinned_to }) => !pinned_to?.includes(sandboxId))
    .map(async message => await slack.admin.chat.delete({
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
