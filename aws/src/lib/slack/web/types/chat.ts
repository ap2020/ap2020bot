import type { MessageAttachment, WebAPICallResult } from '@slack/web-api';

export type Message = {
  text: string;
  attachments: MessageAttachment[];
  type: string;
  ts: string;
};

export type PostMessageResult = WebAPICallResult & {
  message: Message;
};
