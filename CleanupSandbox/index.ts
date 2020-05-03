import { AzureFunction, Context } from "@azure/functions" 
import {flatten} from "lodash";
import moment from 'moment-timezone';
import {slack, dateToSlackTS, slackTSToDate} from "../utils/slack";
import type {Slack} from "../utils/slack-types";
import { drive_v3, google } from "googleapis";
import { getGoogleClient } from "../utils/google-client";

const sandboxId = process.env.SLACK_CHANNEL_SANDBOX;

interface LastSavedMessage {
    ts: string;
}

const main: AzureFunction = async function (context: Context, timer: unknown, lastSavedMessage: LastSavedMessage): Promise<LastSavedMessage> {
    return await cleanupSandbox(lastSavedMessage);
};

export default main;

const cleanupSandbox = async (lastSavedMessage: LastSavedMessage): Promise<LastSavedMessage> => {
    const dumpFolderId = process.env.GOOGLE_FOLDER_SANDBOX_DUMP_ID;
    const auth = getGoogleClient();
    const drive = google.drive({version: "v3", auth});
    const deleteAfter = 24 * 60 * 60 * 1000;
    const latestOldTS = dateToSlackTS(new Date(Date.now() - deleteAfter)); // latest timestamp that should be cleaned
    const messages = (await listMessages(sandboxId, { oldest: lastSavedMessage.ts, latest: latestOldTS, /* inclusive: false */})).reverse();
    // inclusive: false doesn't work (because of Slack?) but default is false so just leave it empty
    const hooks: ((message: Slack.Message) => unknown)[] = [
        deleteMessages,
    ];
    await Promise.all([
        ...flatten(
            messages
                .map(message => (
                    hooks.map(async hook => await hook(message))
                ))
        ),
        dumpMessages(drive, messages, dumpFolderId, lastSavedMessage.ts, latestOldTS),
    ]);
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
 
const deleteMessages = async (message: Slack.Message) => {
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

const createFolderIfMissing = async (drive: drive_v3.Drive, parentId: string, name: string): Promise<drive_v3.Schema$File> => {
    const searchResult: drive_v3.Schema$File[] = (await drive.files.list({
        q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder'`, // TODO: injection!
    })).data.files;
    if (searchResult.length === 0) {
        // not found, so create folder
        const folder = (await drive.files.create({
            requestBody: {
                name: name,
                parents: [parentId],
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id'
        })).data;
        return folder;
    } else {
        if (searchResult.length > 1) {
            console.error('More than one folder named', name, searchResult.map(({id}) => id));
            // まあでも致命的ではないのでとりあえずそのまま実行
        }
        return searchResult[0];
    }
}

const dumpMessages = async (drive: drive_v3.Drive, messages: Slack.Message[], dumpFolderId: string, oldestTS: string, latestTS: string) => {
    const oldest = moment(slackTSToDate(oldestTS)).tz('Asia/Tokyo');
    const latest = moment(slackTSToDate(latestTS)).tz('Asia/Tokyo');
    const dump = JSON.stringify(messages);
    
    const ymfolder = await createFolderIfMissing(drive, dumpFolderId, oldest.format('YYYY-MM'));
    const dayfolder = await createFolderIfMissing(drive, ymfolder.id, oldest.format('DD'));
    
    await drive.files.create({
        requestBody: {
            name: `sandbox-dump-${oldest.format('YYYYMMDD-HHmmss')}-${latest.format('YYYYMMDD-HHmmss')}.json`,
            mimeType: 'application/json',
            parents: [dayfolder.id],
        },
        media: {
            mimeType: 'application/json',
            body: dump,
        },
    });
}

// (async () => {
//     const start = Date.now();
//     await cleanupSandbox({ts: '1234567890.000000'});
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })();
