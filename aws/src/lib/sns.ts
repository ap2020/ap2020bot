import { SNS } from '@aws-sdk/client-sns';
import { isReal, stage } from './stages';

export const sns = new SNS(
  isReal(stage) ?
    {} :
    {
      region: 'us-east-1',
      endpoint: 'http://localhost:3001',
    },
);
