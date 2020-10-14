import { AzureFunction, Context } from "@azure/functions" 
import moment from 'moment-timezone';
import {listMessages} from "../utils/slack/message";
import {momentToSlackTS, slackTSToMoment} from "../utils/slack/timestamp";
import type {Slack} from "../utils/slack/types";
import { drive_v3, google } from "googleapis";
import { getGoogleClient } from "../utils/google-client";
import type {LastDumpedMessage} from "./output";

const main: AzureFunction = async function (context: Context, timer: unknown, lastDumpedMessage: LastDumpedMessage): Promise<LastDumpedMessage> {
    const newLastDumpedMessage = await dumpSandbox(lastDumpedMessage, context);
    return newLastDumpedMessage;
};

export default main;

const dumpSandbox = async (lastDumpedMessage: LastDumpedMessage, context: Context): Promise<LastDumpedMessage> => {
    const sandboxId = process.env.SLACK_CHANNEL_SANDBOX;
    const dumpFolderId = process.env.GOOGLE_FOLDER_SANDBOX_DUMP_ID;
    const auth = getGoogleClient();
    const drive = google.drive({version: "v3", auth});
    const deleteAfter = moment.duration(1, 'days');
    const latestOldTS = momentToSlackTS(moment().subtract(deleteAfter)); // latest timestamp that should be cleaned
    const messages = (await listMessages({
        channel: sandboxId,
        oldest: lastDumpedMessage.ts,
        latest: latestOldTS,
        threadPolicy: 'just-in-range',
        /* inclusive: false */
    }));
    // inclusive: false doesn't work (because of Slack?) but default is false so just leave it empty
    if (messages.length === 0) {
        return lastDumpedMessage;
    } else {
        const newLastDumpedMessage = messages[messages.length - 1];
        await dumpMessages(drive, context, messages, dumpFolderId, lastDumpedMessage.ts, newLastDumpedMessage.ts);
        return {ts: newLastDumpedMessage.ts};
    }
}

const createFolderIfMissing = async (drive: drive_v3.Drive, context: Context, parentId: string, name: string): Promise<drive_v3.Schema$File> => {
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
            context.log.error('More than one folder named', name, searchResult.map(({id}) => id));
            // まあでも致命的ではないのでとりあえずそのまま実行
        }
        return searchResult[0];
    }
}

const dumpMessages = async (drive: drive_v3.Drive, context: Context, messages: Slack.Message[], dumpFolderId: string, oldestTS: string, latestTS: string) => {
    const oldest = slackTSToMoment(oldestTS);
    const latest = slackTSToMoment(latestTS);
    const dump = JSON.stringify(messages);
    
    const ymfolder = await createFolderIfMissing(drive, context, dumpFolderId, oldest.format('YYYY-MM'));
    const dayfolder = await createFolderIfMissing(drive, context, ymfolder.id, oldest.format('DD'));
    
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

// import { context } from '../utils-dev/fake-context';
// (async () => {
//     const start = Date.now();
//     await dumpSandbox({ts: '1234567890.000000'}, context);
//     const end = Date.now();
//     console.log('elapsed time:', end - start);
// })().catch(console.error);