import { AzureFunction, Context } from "@azure/functions"
import {slack, dateToSlackTS} from "../utils/slack";
import type {Slack} from "../utils/slack-types";

const sandboxId = process.env.SLACK_CHANNEL_SANDBOX;

interface LastSavedMessage {
    ts: string;
}

const main: AzureFunction = async function (context: Context, timer: unknown, lastSavedMessage: LastSavedMessage): Promise<LastSavedMessage> {
    return await cleanupSandbox(lastSavedMessage);
};

export default main;

const cleanupSandbox = async (lastSavedMessage: LastSavedMessage): Promise<LastSavedMessage> => {
    const deleteAfter = 60 * 1000;//24 * 60 * 60 * 1000;
    const latestOldTS = dateToSlackTS(new Date(Date.now() - deleteAfter)); // latest timestamp that should be cleaned
    const messages = (await listMessages(sandboxId, { oldest: lastSavedMessage.ts, latest: latestOldTS, inclusive: false})).reverse();

    return {ts: '1234567890.0000000'};
}

const listMessages = async (
        channel: string,
        option: { latest?: string; oldest?: string, inclusive?: boolean } = {}
): Promise<Slack.Message[]> => {
    const {messages} = (await slack.bot.conversations.history({
        channel, 
        count: 1000, // TODO: handle has_more
        ...option,
    })) as Slack.Conversation.History;

    return messages;
};

// (async () => {
//     const start = Date.now();
//     await cleanupSandbox({ts: '1234567890.0000000'});
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })();
