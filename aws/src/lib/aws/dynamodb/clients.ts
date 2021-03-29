import { isReal, stage } from '@/lib/stages';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { resourcePrefix } from '../utils';

const options = (
  isReal(stage) ?
    {} :
    {
      region: 'localhost',
      endpoint: 'http://localhost:8000',
    }
);

const dynamodbRaw = new DynamoDB(options);

export const dynamodb = new DynamoDB.DocumentClient(options);

export const dynamoMapper = new DataMapper({
  client: dynamodbRaw,
  tableNamePrefix: resourcePrefix,
});
