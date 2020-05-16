import { flatten } from 'lodash';
import moment from 'moment-timezone';
import { slack } from './clients';
import { slackTSToMoment } from './timestamp';
import type { Slack } from './types';

export const isThreadParent = (message: Slack.Message): message is Slack.ThreadParent =>
    'thread_ts' in message && typeof message.thread_ts === 'string' && message.thread_ts === message.ts;

export const isThreadChildHidden = (message: Slack.Conversation.Replies['messages'][number]): message is Slack.ThreadChild => // ThreadChildInChannelも除外するけど，TSの型システムでは無理
    message.thread_ts !== message.ts && message.subtype !== 'thread_broadcast';

// TODO: どうにか共通化できないか，あるいはswitchを関数に切り出しちゃうか
export const listMessages = async (
    channel: string,
    option: { latest?: string; oldest?: string; inclusive?: boolean; limit?: number; threadPolicy: 'nothing' | 'all-or-nothing' | 'just-in-range' } = { threadPolicy: 'just-in-range' },
): Promise<Slack.Message[]> => {
    const oldestDate = option.oldest === undefined ? moment(0).tz('Asia/Tokyo') : slackTSToMoment(option.oldest);
    const latestDate = option.latest === undefined ? moment().add(1, 'days') : slackTSToMoment(option.latest); //十分大きい時刻
    let messages: Slack.Message[];
    switch (option.threadPolicy) {
        case 'all-or-nothing': {
            ({ messages } = (await slack.bot.conversations.history({
                channel,
                ...option,
                count: option.limit ?? 1000, // TODO: handle has_more
            })) as Slack.Conversation.History);
            // add thread messages
            await Promise.all(
                messages
                    .filter(isThreadParent)
                    .filter(
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        ({ latest_reply }) => // if latest reply is before latest
                            slackTSToMoment(latest_reply) <= latestDate,
                    )
                    .map(async message => {
                        const threadRest = (await slack.user.conversations.replies({
                            channel,
                            ts: message.ts,
                            limit: 1000, // TODO: handle has_more
                        }) as Slack.Conversation.Replies).messages.filter(isThreadChildHidden);
                        messages = messages.concat(threadRest);
                    }),
            );
            break;
        }
        case 'just-in-range': {
            ({ messages } = (await slack.bot.conversations.history({
                channel,
                count: option.limit ?? 1000, // TODO: handle has_more
                inclusive: option.inclusive,
                latest: option.latest,
            // no oldest because child of outdated parent can be new
            })) as Slack.Conversation.History);
            // get all hidden thread messages
            messages = messages.concat(
                flatten(
                    await Promise.all(
                        messages
                            .filter(isThreadParent)
                            .filter(
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                ({ ts: oldest_reply, latest_reply }) => // filter threads that may have replies in range
                                    oldestDate <= slackTSToMoment(latest_reply) && slackTSToMoment(oldest_reply) <= latestDate,
                            )
                            .map(
                                async message =>
                                    (await slack.user.conversations.replies({
                                        channel,
                                        ts: message.ts,
                                        ...option,
                                        limit: option.limit ?? 1000, // TODO: handle has_more
                                    }) as Slack.Conversation.Replies).messages
                                        .filter(isThreadChildHidden),
                            ),
                    ),
                ).filter(
                    ({ ts }) => // whether message's ts is in range
                        oldestDate <= slackTSToMoment(ts) && slackTSToMoment(ts) <= latestDate,
                ),
            );
            break;
        }
        case 'nothing': {
            ({ messages } = (await slack.bot.conversations.history({
                channel,
                count: option.limit ?? 1000, // TODO: handle has_more
                ...option,
            })) as Slack.Conversation.History);
            break;
        }
        default: {
            const __exhaustiveCheck: never = option.threadPolicy;
            break;
        }
    }
    return messages.filter(({ ts }) => ( // if exclusive, remove exact match
        option.inclusive ?
            true :
            ts !== option.latest && ts !== option.oldest
    )).sort(({ ts }) => Number(ts)); // TODO: in-place sortなのでin-placeっぽく書きたいね
};
