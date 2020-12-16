import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import { ChannelCreatedEvent, SlackSNSMessage } from '@/lib/slack/events/types';
import { SNSHandler } from 'aws-lambda';

export const handler: SNSHandler = async (snsEvent) => {
  const event = JSON.parse(snsEvent.Records[0].Sns.Message);
  await main(event);
}

const main = async ({event: {channel}}: SlackSNSMessage<ChannelCreatedEvent>) => {
  await Promise.all([
    (await slack.bot).chat.postMessage({
        channel: await envvar.get('slack/channel/notify-others'),
        text: `:new: <@${channel.creator}> が <#${channel.id}> を作成しました :rocket:`,
    }),
    (await slack.bot).conversations.join({
        channel: channel.id,
    })
]);
}
