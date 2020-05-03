import type {WebAPICallResult} from '@slack/web-api';

export module Slack {
    export interface Message {
        type: string;
        subtype?: string;
        user: string;
        text: string;
        ts: string;
        blocks?: unknown[];
        attachments?: unknown[];
        client_msg_id?: string;
        team?: string;
        pinned_to: string[];
        pinned_info: {
            channel: string;
            pinned_by: string;
            pinned_ts: number;
        };
        inviter: string;
    }

    export module Conversation {
        export interface History extends WebAPICallResult {
            ok: boolean;
            response_metadata?:  {
                next_cursor: string;
            };
            messages: Message[];
            has_more: boolean;
            pin_count: number;
            is_limited?: boolean;
            latest?: string;
            channel_actions_ts?: unknown;
            channel_actions_count?: number;
        }
    }
}
