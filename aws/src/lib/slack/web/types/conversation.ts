import type { WebAPICallResult } from '@slack/web-api';

export type Conversation = {
  id: string;
  name: string;
};

export type InfoResult = WebAPICallResult & {
  channel: Conversation;
};
