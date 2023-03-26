import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient as DocumentClient } from '@aws-sdk/lib-dynamodb';
import { isReal, stage } from './stages';

const client = new DynamoDBClient(
  isReal(stage) ?
    {} :
    {
      region: 'localhost',
      endpoint: 'http://localhost:8000',
    },
);
export const db = DocumentClient.from(client);
