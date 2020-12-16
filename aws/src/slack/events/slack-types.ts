export type SlackEvent =
  | ChannelCreated
  | ChannelUnarchive

export type EventPayload = {
  // token: string; // deprecated
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
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

export type ChannelCreated = {
  type: "channel_created";
  channel: {
      id: string;
      name: string;
      created: number;
      creator: string;
  }
}

export type ChannelUnarchive = {
  type: "channel_unarchive";
  channel: string;
  user: string;
}
