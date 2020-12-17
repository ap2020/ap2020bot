import { SNS } from "aws-sdk";

export const sns = new SNS(
  process.env.IS_OFFLINE ?
    {
        region: 'us-east-1',
        endpoint: 'http://localhost:3001',
    } :
    {},
);
