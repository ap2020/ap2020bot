/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-namespace */

import type { WebAPICallResult } from '@slack/web-api';

export namespace Slack {
  interface MessageBase {
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
  }

  export interface ThreadMessageBase extends MessageBase {
    thread_ts: string;
  }

  export interface ThreadParent extends ThreadMessageBase {
    reply_count: number;
    reply_users_count: number;
    latest_reply: string;
    reply_users: string[];
    subscribed: boolean;
    last_read?: string;
  }

  export interface ThreadChild extends ThreadMessageBase {
    parent_user_id: string;
  }

  export interface ThreadChildInChannel extends ThreadChild {
    subtype: 'thread_broadcast';
    root: ThreadParent;
  }

  export type ThreadMessage = ThreadParent | ThreadChild | ThreadChildInChannel;

  export type Message = MessageBase | ThreadMessage;

  export namespace Conversation {
    export interface History extends WebAPICallResult {
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
    }

    export interface Replies extends WebAPICallResult {
      ok: boolean;
      response_metadata?: {
        next_cursor: string;
      };
      messages: [
        ThreadParent,
        ...(ThreadChild | ThreadChildInChannel)[]
      ];
      has_more: boolean;
    }
  }
}
