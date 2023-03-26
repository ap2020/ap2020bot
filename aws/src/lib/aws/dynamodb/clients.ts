import { isReal, stage } from '@/lib/stages';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient as DocumentClient } from '@aws-sdk/lib-dynamodb';

const options = (
  isReal(stage) ?
    {} :
    {
      region: 'localhost',
      endpoint: 'http://localhost:8000',
      accessKeyId: 'FAKE',
      secretAccessKey: 'FAKE',
    }
);

const client = new DynamoDBClient(options);
export const dynamodb = DocumentClient.from(client);
