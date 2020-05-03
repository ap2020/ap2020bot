import { AzureFunction, Context } from "@azure/functions" 
import {flatten} from "lodash";
import {slack, listMessages} from "../utils/slack";
import type {Slack} from "../utils/slack-types";
import { QueueMessage } from "../DumpSandbox/for-cleaner";

const main: AzureFunction = async function (context: Context, timer: unknown, queueMessage: QueueMessage): Promise<void> {
    await cleanupSandbox(queueMessage);
};

export default main;

const cleanupSandbox = async ({lastDumped}: QueueMessage): Promise<void> => {
    const sandboxId = process.env.SLACK_CHANNEL_SANDBOX;
    const messages = (await listMessages(sandboxId, { latest: lastDumped.ts, inclusive: true})).reverse();
    // inclusive: false doesn't work (because of Slack?) but default is false so just leave it empty
    const hooks: ((message: Slack.Message) => unknown)[] = [
        async (message) => await deleteMessage(message, sandboxId),
    ];
    await Promise.all([
        ...flatten(
            messages
                .map(message => (
                    hooks.map(async hook => await hook(message))
                ))
        ),
    ]);
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
// })();
