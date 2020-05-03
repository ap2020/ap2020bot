import { WebClient } from '@slack/web-api';
import type {Slack} from './slack-types';

export const slack = {
    bot: new WebClient(process.env.SLACK_TOKEN_BOT),
    admin: new WebClient(process.env.SLACK_TOKEN_ADMIN),
};

export const dateToSlackTS = (date: Date): string =>
    (date.getTime()/1000).toFixed(3);

export const slackTSToDate = (ts: string): Date =>
    new Date(Number(ts) * 1000)

export const listMessages = async (
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
