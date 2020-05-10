import { AzureFunction, Context } from "@azure/functions" 
import {slack, listMessages} from "../utils/slack";
import type {Slack} from "../utils/slack-types";
import type {LastDumpedMessage} from '../DumpSandbox/output';

const main: AzureFunction = async function (context: Context, timer: unknown, lastDumpedMessage: LastDumpedMessage): Promise<void> {
    await cleanupSandbox(lastDumpedMessage);
};

export default main;

const cleanupSandbox = async (lastDumped: LastDumpedMessage): Promise<void> => {
    const sandboxId = process.env.SLACK_CHANNEL_SANDBOX;
    const messages = (await listMessages(
        sandboxId,
        {
            latest: lastDumped.ts,
            inclusive: true,
            limit: 40, // to avoid rate limit
            threadPolicy: 'all-or-nothing',
        })
    ).filter(({subtype}) => subtype !== 'tombstone');
    await Promise.all(messages
        .map(async message => deleteMessage(message, sandboxId))
    );
}

const deleteMessage = async (message: Slack.Message, sandboxId: string) => {
    if (message.pinned_to?.includes(sandboxId)) {
        // pinned so don't delete
        return;
    }
    await slack.admin.chat.delete({
        channel: sandboxId,
        ts: message.ts,
        as_user: true,
    });
}

// (async () => {
//     const start = Date.now();
//     await cleanupSandbox({lastDumped: {ts: '1234567890.000000'}});
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })().catch(console.error);
