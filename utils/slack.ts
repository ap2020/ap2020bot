import { WebClient } from '@slack/web-api';
import {flatten} from 'lodash';
import type {Slack} from './slack-types';

export const isThreadParent = (message: Slack.Message): message is Slack.ThreadParent =>
    'thread_ts' in message && typeof message.thread_ts === 'string' && message.thread_ts === message.ts;

export const isThreadChildHidden = (message: Slack.Conversation.Replies["messages"][number]): message is Slack.ThreadChild => // ThreadChildInChannelも除外するけど，TSの型システムでは無理
    message.thread_ts != message.ts && message.subtype != "thread_broadcast";

export const slack = {
    bot: new WebClient(process.env.SLACK_TOKEN_BOT),
    user: new WebClient(process.env.SLACK_TOKEN_USER),
    admin: new WebClient(process.env.SLACK_TOKEN_ADMIN),
};

export const dateToSlackTS = (date: Date): string =>
    (date.getTime()/1000).toFixed(3);

export const slackTSToDate = (ts: string): Date =>
    new Date(Number(ts) * 1000)

export const listMessages = async (
    channel: string,
    option: { latest?: string; oldest?: string, inclusive?: boolean, limit?: number, thread_policy: 'nothing' | 'all-or-nothing' | 'just-in-range' } = { thread_policy: 'just-in-range'}
): Promise<Slack.Message[]> => {
    let {messages} = (await slack.bot.conversations.history({
        channel, 
        count: option.limit ?? 1000, // TODO: handle has_more
        ...option,
    })) as Slack.Conversation.History;
    switch (option.thread_policy) {
        case 'all-or-nothing':
            // add thread messages
            await Promise.all(
                messages
                    .filter(isThreadParent)
                    .filter(({latest_reply}) => // if latest reply is before latest
                        option.latest === undefined? true : slackTSToDate(latest_reply) < slackTSToDate(option.latest) 
                    )
                    .map(async message => {
                        const thread_rest = (await slack.user.conversations.replies({
                            channel,
                            ts: message.ts,
                            limit: 1000,  // TODO: handle has_more
                        }) as Slack.Conversation.Replies).messages.filter(isThreadChildHidden);
                        messages = messages.concat(thread_rest);
                    })
            );
            break;
        case 'just-in-range':
            // get all hidden thread messages
            messages = messages.concat(
                flatten(
                    await Promise.all(
                        messages
                            .filter(isThreadParent)
                            .map(async message => 
                                (await slack.user.conversations.replies({
                                    channel,
                                    ts: message.ts,
                                    limit: 1000,  // TODO: handle has_more
                                }) as Slack.Conversation.Replies).messages.filter(isThreadChildHidden)
                            )
                    )
                ).filter(({ts}) => option.latest === undefined? true : slackTSToDate(ts) < slackTSToDate(option.latest)) // whether message's ts is in range
            );
            break;
        case 'nothing':
            break;
    }
    return messages;
};
