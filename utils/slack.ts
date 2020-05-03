import { WebClient } from '@slack/web-api';

export const slack = {
    bot: new WebClient(process.env.SLACK_TOKEN_BOT),
    admin: new WebClient(process.env.SLACK_TOKEN_ADMIN),
};

export const dateToSlackTS = (date: Date): string =>
    (date.getTime()/1000).toFixed(3);

export const slackTSToDate = (ts: string): Date =>
    new Date(Number(ts) * 1000)
