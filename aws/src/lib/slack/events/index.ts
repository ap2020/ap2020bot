import { envvar } from '@/lib/envvar';
import { SNSHandler } from 'aws-lambda';
import { SlackEvent, SlackSNSMessage } from './types';

export const getSlackEventTopicARN = async () => {
  return `arn:aws:sns:us-east-1:${await envvar.get('aws/account-id')}:ap2020bot-${process.env.STAGE}-slack-events`;
};

export const createHandler = <Event extends SlackEvent>(callback: ((message: SlackSNSMessage<Event>) => Promise<void>)): SNSHandler => {
  return async (snsEvent) => {
    const message = JSON.parse(snsEvent.Records[0].Sns.Message);
    await callback(message);
  };
};
