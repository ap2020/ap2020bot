import { WebClient } from '@slack/web-api';

export const slack = {
    bot: new WebClient(process.env.SLACK_TOKEN_BOT)
};
