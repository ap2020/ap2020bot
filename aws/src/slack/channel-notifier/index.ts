import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import { createHandler } from '@/lib/slack/events';
import { ChannelCreatedEvent, ChannelUnarchiveEvent, SlackSNSMessage } from '@/lib/slack/events/types';
import { SNSHandler } from 'aws-lambda';

const channelCreatedMain = async ({ event: { channel } }: SlackSNSMessage<ChannelCreatedEvent>) => {
    await Promise.all([
        (await slack.bot).chat.postMessage({
            channel: await envvar.get('slack/channel/notify-others'),
            text: `:new: <@${channel.creator}> が <#${channel.id}> を作成しました :rocket:`,
        }),
        (await slack.bot).conversations.join({
            channel: channel.id,
        }),
    ]);
};

const channelUnarchiveMain = async ({ event: { user, channel } }: SlackSNSMessage<ChannelUnarchiveEvent>) => {
    await (await slack.bot).chat.postMessage({
        channel: await envvar.get('slack/channel/notify-others'),
        text: `:recycle: <@${user}> が <#${channel}> をアーカイブから復元しました :rocket:`,
    });
};

export const channelCreatedHandler: SNSHandler = createHandler<ChannelCreatedEvent>(channelCreatedMain);

export const channelUnarchiveHandler: SNSHandler = createHandler<ChannelUnarchiveEvent>(channelUnarchiveMain);
