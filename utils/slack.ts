import { WebClient } from '@slack/web-api';

export const slack = {
    bot: new WebClient(process.env.SLACK_TOKEN_BOT)
};

export const dateToSlackTS = (date: Date): string =>
    (date.getTime()/1000).toFixed(3);
