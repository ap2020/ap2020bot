import AWS from 'aws-sdk';
import { isReal, stage } from './stages';

export const db = new AWS.DynamoDB.DocumentClient(
  isReal(stage) ?
    {} :
    {
      region: 'localhost',
      endpoint: 'http://localhost:8000',
    },
);
