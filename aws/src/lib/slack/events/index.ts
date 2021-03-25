import { envvar } from '@/lib/envvar';
import { stage } from '@/lib/stages';
import type { SNSHandler } from 'aws-lambda';
import type { SlackEvent, SlackSNSMessage } from './types';

export const getSlackEventTopicARN = async (): Promise<string> =>
  `arn:aws:sns:us-east-1:${await envvar.get('aws/account-id')}:ap2020bot-${stage}-slack-events`;

export const createHandler = <Event extends SlackEvent>(
  callback: ((message: SlackSNSMessage<Event>) => Promise<void>),
): SNSHandler =>
  async (snsEvent) => {
    const message = JSON.parse(snsEvent.Records[0].Sns.Message) as SlackSNSMessage<Event>;
    await callback(message);
  };
