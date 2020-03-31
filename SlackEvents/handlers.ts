import { Context } from "@azure/functions"
import { WebClient } from '@slack/web-api';

const webClient = new WebClient(process.env.SLACK_TOKEN_BOT);

namespace Events {
    export interface ChannelCreated {
        type: "channel_created";
        channel: {
            id: string;
            name: string;
            created: number;
            creator: string;
        }
    }

    export interface ChannelUnarchive {
        type: "channel_unarchive";
        channel: string;
        user: string;
    }
}

// Handlers
// the name of the handler must be the type of the event

export const channel_created = async ({channel}: Events.ChannelCreated, context: Context) => {
    await webClient.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_NOTIFICATIONS_OTHERS,
        text: `:new: <@${channel.creator}> が <#${channel.id}> を作成しました :rocket:`,
    });
}

export const channel_unarchive = async ({channel, user}: Events.ChannelUnarchive, context: Context) => {
    await webClient.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_NOTIFICATIONS_OTHERS,
        text: `:recycle: <@${user}> が <#${channel}> をアーカイブから復元しました :rocket:`,
    });
};