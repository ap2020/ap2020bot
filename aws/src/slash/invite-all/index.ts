import querystring from 'querystring';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import type { WebAPICallResult } from '@slack/web-api';
import { verify } from '@/lib/slack/verify';
import type { SlashParams } from '../lib/params';

// TODO: ライブラリに切り出す
type Member = {
  id: string;
}

const main = async (params: SlashParams) => {
  // TODO: 引数にチャンネル名をとり，ワークスペース全員ではなく，チャンネルのメンバー全員を招待する
  // TODO: 元のeslintルールに反映
  // eslint-disable-next-line no-restricted-syntax
  for await (const page of (await slack.bot).paginate('users.list')) {
    const { members } = page as WebAPICallResult & {members: Member[]};
    const botId = await envvar.get('slack/user_id/bot');
    await (await slack.bot).conversations.invite({
      channel: params.channel_id,
      users: members.filter(({ id }) => id !== botId).map(({ id }) => id).join(','),
    });
  }
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!(await verify(event))) {
    return {
      statusCode: 400,
      body: 'invalid request',
    };
  }

  // TODO: use SQS to avoid timeout
  // verify をしたので，スキーマを満たしていることが保証される
  await main(querystring.parse(event.body) as SlashParams);
  return '';
};
