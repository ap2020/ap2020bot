/* eslint @typescript-eslint/naming-convention: [
    "warn",
    {
        "selector": "default",
        "format": ["camelCase"],
        "leadingUnderscore": "allow",
        "trailingUnderscore": "allow",
    },
    {
        "selector": "property",
        "format": ["camelCase", "snake_case"],
        "leadingUnderscore": "allow",
        "trailingUnderscore": "allow",
    },
    {
        "selector": "typeLike",
        "format": ["PascalCase"],
    },
]
*/
/* eslint @typescript-eslint/no-namespace: "off"
*/
// TODO: enable this rule above

import type { WebAPICallResult } from '@slack/web-api';

export declare namespace Slack {
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

    export interface ThreadParent extends MessageBase {
        thread_ts: string;
        reply_count: number;
        reply_users_count: number;
        latest_reply: string;
        reply_users: string[];
        subscribed: boolean;
        last_read?: string;
    }

    export interface ThreadChild extends MessageBase {
        thread_ts: string;
        parent_user_id: string;
    }

    export interface ThreadChildInChannel extends ThreadChild {
        subtype: 'thread_broadcast';
        root: ThreadParent;
    }

    export type Message = MessageBase | ThreadParent | ThreadChild | ThreadChildInChannel;

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
                ...(ThreadChild | ThreadChildInChannel)[],
            ];
            has_more: boolean;
        }
    }
}
