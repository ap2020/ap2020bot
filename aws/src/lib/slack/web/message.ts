import { slack } from '@/lib/slack/client';
import { DateTime } from 'luxon';
import { slackTSToDateTime } from '../timestamp';
import type { Conversation } from './types';

export const isThreadMessage = (message: Conversation.Message): message is Conversation.ThreadMessage =>
  'thread_ts' in message && typeof message.thread_ts === 'string';

export const isThreadParent = (message: Conversation.Message): message is Conversation.ThreadParent =>
  isThreadMessage(message) && message.thread_ts === message.ts;

// ThreadChildInChannelも除外するけど，TSの型システムでは無理
export const isThreadChildHidden = (
  message: Conversation.RepliesResult['messages'][number],
): message is Conversation.ThreadChild =>
  message.thread_ts !== message.ts && message.subtype !== 'thread_broadcast';

type ThreadPolicy = 'nothing' | 'all-or-nothing' | 'just-in-range';

type ListMessagesArgs = {
  channel: string;
  threadPolicy: ThreadPolicy;
  latest?: string;
  oldest?: string;
  inclusive?: boolean;
  limit?: number;
};

type ListMessagesSubArgs = [
  ListMessagesArgs,
  {
    latest: DateTime;
    oldest: DateTime;
  }
];

const _listRedundantMessages: {
  [key in ThreadPolicy]: (...a: ListMessagesSubArgs) => Promise<Conversation.Message[]>
} = {
  'all-or-nothing': async (args, datetimes) => {
    const { messages } = (await (await slack.bot).conversations.history({
      ...args,
      count: args.limit ?? 1000, // TODO: handle has_more
    })) as Conversation.HistoryResult;
    const threadMessages: Conversation.ThreadMessage[][] =
            await Promise.all(
              messages
                // eslint-disable-next-line unicorn/no-array-callback-reference
                .filter(isThreadParent)
                .filter(
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  ({ latest_reply }) => // if latest reply is before latest
                    slackTSToDateTime(latest_reply) <= datetimes.latest,
                )
                .map(
                  async message =>
                    (await (await slack.user()).conversations.replies({
                      channel: args.channel,
                      ts: message.ts,
                      limit: 1000, // TODO: handle has_more
                    }) as Conversation.RepliesResult).messages,
                ),
            );
    return [
      ...messages.filter(message => !isThreadMessage(message)),
      ...threadMessages.flat(),
    ];
  },
  'just-in-range': async (args, moments) => {
    const { messages } = (await (await slack.bot).conversations.history({
      channel: args.channel,
      count: args.limit ?? 1000, // TODO: handle has_more
      inclusive: args.inclusive,
      latest: args.latest,
      // no oldest because child of outdated parent can be new
    })) as Conversation.HistoryResult;
    // get all hidden thread messages
    const threadMessages: Conversation.ThreadChild[][] = await Promise.all(
      messages
      // search for thread parents
        // eslint-disable-next-line unicorn/no-array-callback-reference
        .filter(isThreadParent)
      // filter threads that may have replies in range
        .filter(
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ({ ts: oldest_reply, latest_reply }) =>
            moments.oldest <= slackTSToDateTime(latest_reply) && slackTSToDateTime(oldest_reply) <= moments.latest,
        )
        .map(
          async message =>
          // fetch children
            (await (await slack.user()).conversations.replies({
              ...args,
              ts: message.ts,
              limit: args.limit ?? 1000, // TODO: handle has_more
            }) as Conversation.RepliesResult).messages
            // filter out messages posted in channel
              // eslint-disable-next-line unicorn/no-array-callback-reference
              .filter(isThreadChildHidden),
        ),
    );
    return [...messages, ...threadMessages.flat()]
    // filter message whose ts is in range
      .filter(
        ({ ts }) =>
          moments.oldest <= slackTSToDateTime(ts) && slackTSToDateTime(ts) <= moments.latest,
      );
  },
  nothing: async (args) =>
    (await (await slack.bot).conversations.history({
      ...args,
      count: args.limit ?? 1000, // TODO: handle has_more
    }) as Conversation.HistoryResult).messages,
};

export const listMessages = async (args: ListMessagesArgs): Promise<Conversation.Message[]> => {
  const oldest = args.oldest === undefined ? DateTime.fromMillis(0).setZone('Asia/Tokyo') : slackTSToDateTime(args.oldest);
  const latest = args.latest === undefined ? DateTime.now().plus({ days: 1 }) : slackTSToDateTime(args.latest); // 十分大きい時刻
  const messages =
        (await _listRedundantMessages[args.threadPolicy](args, { oldest, latest }))
          .filter(({ ts }) => ( // if exclusive, remove exact match
            args.inclusive ?
              true :
              ts !== args.latest && ts !== args.oldest
          ));
  messages.sort(({ ts: ts1 }, { ts: ts2 }) => Number(ts1) - Number(ts2));
  return messages;
};
