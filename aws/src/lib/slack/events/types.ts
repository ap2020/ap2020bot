/* eslint-disable @typescript-eslint/naming-convention -- Type definitions are based on Slack API schema  */

export type SlackEvent =
  | ChannelCreatedEvent
  | ChannelUnarchiveEvent

export type EventPayload<Event extends SlackEvent = SlackEvent> = {
  // token: string; // deprecated
  team_id: string;
  api_app_id: string;
  event: Event;
  type: 'event_callback';
  event_id: string;
  event_time: number;
  event_context: string;
  // authed_users: string[]; // deprecated https://api.slack.com/changelog/2020-09-15-events-api-truncate-authed-users
  authorizations: {
    enterprise_id: string;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }[];
}

export type SlackSNSMessage<Event extends SlackEvent> = EventPayload<Event>;

export type ChannelCreatedEvent = {
  type: 'channel_created';
  channel: {
    id: string;
    name: string;
    created: number;
    creator: string;
  };
}

export type ChannelUnarchiveEvent = {
  type: 'channel_unarchive';
  channel: string;
  user: string;
}
