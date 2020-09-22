import { WebClient } from '@slack/web-api';
import { envvar } from '../envvar';

export const slack = {
    bot: (async () => (new WebClient(await envvar.get('slack/token/bot'))))(),
};
