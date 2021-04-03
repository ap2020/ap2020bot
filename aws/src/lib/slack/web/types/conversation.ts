/* eslint-disable @typescript-eslint/naming-convention */
import type { WebAPICallResult } from '@slack/web-api';

export type Conversation = {
  id: string;
  name: string;
};

export type InfoResult = WebAPICallResult & {
  channel: Conversation;
};

type MessageBase = {
  type: string;
  subtype?: string;
  user: string;
  text: string;
  ts: string;
  blocks?: unknown[];
  attachments?: unknown[];
  client_msg_id?: string;
  team?: string;
  reactions?: {
    name: string; // without colons
    users: string[];
    count: number;
  }[];
  pinned_to?: string[];
  pinned_info: {
    channel: string;
    pinned_by: string;
    pinned_ts: number;
  };
  inviter: string;
};

export type ThreadMessageBase = MessageBase &
{
  thread_ts: string;
};

export type ThreadParent = ThreadMessageBase & {
  reply_count: number;
  reply_users_count: number;
  latest_reply: string;
  reply_users: string[];
  subscribed: boolean;
  last_read?: string;
};

export type ThreadChild = ThreadMessageBase & {
  parent_user_id: string;
};

export type ThreadChildInChannel = ThreadChild & {
  subtype: 'thread_broadcast';
  root: ThreadParent;
};

export type ThreadMessage = ThreadParent | ThreadChild | ThreadChildInChannel;

export type Message = MessageBase | ThreadMessage;

export type HistoryResult = WebAPICallResult & {
  ok: boolean;
  response_metadata?: {
    next_cursor: string;
  };
  messages: (MessageBase | ThreadParent | ThreadChildInChannel)[];
  has_more: boolean;
  pin_count: number;
  is_limited?: boolean;
  latest?: string;
  channel_actions_ts?: unknown;
  channel_actions_count?: number;
};

export type RepliesResult = WebAPICallResult & {
  ok: boolean;
  response_metadata?: {
    next_cursor: string;
  };
  messages: [
    ThreadParent,
    ...(ThreadChild | ThreadChildInChannel)[]
  ];
  has_more: boolean;
};
