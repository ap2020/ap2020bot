import { flatten } from 'lodash';
import type { Moment } from 'moment-timezone';
import moment from 'moment-timezone';
import { slack } from './clients';
import { slackTSToMoment } from './timestamp';
import type { Slack } from './types';

export const isThreadMessage = (message: Slack.Message): message is Slack.ThreadMessage =>
  'thread_ts' in message && typeof message.thread_ts === 'string';

export const isThreadParent = (message: Slack.Message): message is Slack.ThreadParent =>
  isThreadMessage(message) && message.thread_ts === message.ts;

export const isThreadChildHidden = (message: Slack.Conversation.Replies['messages'][number]): message is Slack.ThreadChild => // ThreadChildInChannelも除外するけど，TSの型システムでは無理
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
    latest: Moment;
    oldest: Moment;
  }
];

const _listRedundantMessages: {
  [key in ThreadPolicy]: (...a: ListMessagesSubArgs) => Promise<Slack.Message[]>
} = {
  'all-or-nothing': async (args, moments) => {
    const { messages } = (await slack.bot.conversations.history({
      ...args,
      count: args.limit ?? 1000, // TODO: handle has_more
    })) as Slack.Conversation.History;
    const threadMessages: Slack.ThreadMessage[][] =
            await Promise.all(
              messages
                .filter(isThreadParent)
                .filter(
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  ({ latest_reply }) => // if latest reply is before latest
                    slackTSToMoment(latest_reply) <= moments.latest,
                )
                .map(
                  async message =>
                    (await slack.user.conversations.replies({
                      channel: args.channel,
                      ts: message.ts,
                      limit: 1000, // TODO: handle has_more
                    }) as Slack.Conversation.Replies).messages,
                ),
            );
    return [
      ...messages.filter(message => !isThreadMessage(message)),
      ...flatten(threadMessages),
    ];
  },
  'just-in-range': async (args, moments) => {
    const { messages } = (await slack.bot.conversations.history({
      channel: args.channel,
      count: args.limit ?? 1000, // TODO: handle has_more
      inclusive: args.inclusive,
      latest: args.latest,
      // no oldest because child of outdated parent can be new
    })) as Slack.Conversation.History;
    // get all hidden thread messages
    const threadMessages: Slack.ThreadChild[][] = await Promise.all(
      messages
      // search for thread parents
        .filter(isThreadParent)
      // filter threads that may have replies in range
        .filter(
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ({ ts: oldest_reply, latest_reply }) =>
            moments.oldest <= slackTSToMoment(latest_reply) && slackTSToMoment(oldest_reply) <= moments.latest,
        )
        .map(
          async message =>
          // fetch children
            (await slack.user.conversations.replies({
              ...args,
              ts: message.ts,
              limit: args.limit ?? 1000, // TODO: handle has_more
            }) as Slack.Conversation.Replies).messages
            // filter out messages posted in channel
              .filter(isThreadChildHidden),
        ),
    );
    return messages.concat(flatten(threadMessages))
    // filter message whose ts is in range
      .filter(
        ({ ts }) =>
          moments.oldest <= slackTSToMoment(ts) && slackTSToMoment(ts) <= moments.latest,
      );
  },
  nothing: async (args) =>
    (await slack.bot.conversations.history({
      ...args,
      count: args.limit ?? 1000, // TODO: handle has_more
    }) as Slack.Conversation.History).messages,
};

export const listMessages = async (args: ListMessagesArgs): Promise<Slack.Message[]> => {
  const oldest = args.oldest === undefined ? moment(0).tz('Asia/Tokyo') : slackTSToMoment(args.oldest);
  const latest = args.latest === undefined ? moment().add(1, 'days') : slackTSToMoment(args.latest); // 十分大きい時刻
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
