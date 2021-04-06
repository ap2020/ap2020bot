import { WebClient } from '@slack/web-api';
import { envvar } from '../envvar';

export const slack = {
  // TODO: 即時実行をやめる
  bot: (async () => (new WebClient(await envvar.get('slack/token/bot'))))(),
  user: async (): Promise<WebClient> => (new WebClient(await envvar.get('slack/token/user'))),
  admin: async (): Promise<WebClient> => (new WebClient(await envvar.get('slack/token/admin'))),
};
