import querystring from 'querystring';
import assert from 'assert';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { slack } from '@/lib/slack/client';
import { verify } from '@/lib/slack/verify';
import type { Chat, Conversation } from '@/lib/slack/web/types';
import { reply } from '@/lib/slack/slash/reply';
import { dynamoMapper } from '@/lib/aws/dynamodb/clients';
import { AnonymousLog } from '@/lib/aws/dynamodb/models/anonymous-log';
import type { SlashParams } from '../lib/params';


const main = async (params: SlashParams): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { channel_id, user_id, text, response_url } = params;
  // TODO: cache channel name?
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { channel } = (await (await slack.bot).conversations.info({ channel: channel_id })) as Conversation.InfoResult;

  if (!channel.name.startsWith('1')) {
    await reply({
    /* eslint-disable @typescript-eslint/naming-convention */
      response_url,
      text: 'anonymous post is only allowed in `#1.*` channel.',
    /* eslint-enable @typescript-eslint/naming-convention */
    });
  }

  const { ts: messageTimeStamp } = (await (await slack.bot).chat.postMessage({
    /* eslint-disable @typescript-eslint/naming-convention */
    channel: channel_id,
    text,
    username: 'anonymous',
    icon_emoji: ':bust_in_silhouette:',
    /* eslint-enable @typescript-eslint/naming-convention */
  })) as Chat.PostMessageResult;

  const logEntry = {
    channelID: channel_id,
    timestamp: messageTimeStamp,
    userID: user_id,
  };

  // log in case of errors in DynamoDB
  console.log(logEntry);

  await dynamoMapper.put(Object.assign(new AnonymousLog(), logEntry));
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!(await verify(event))) {
    return {
      statusCode: 400,
      body: 'invalid request',
    };
  }

  assert(event.body !== undefined);

  // TODO: use SQS to avoid timeout
  // verify をしたので，スキーマを満たしていることが保証される
  await main(querystring.parse(event.body) as SlashParams);

  return '';
};
