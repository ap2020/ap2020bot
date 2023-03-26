import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Option } from 'ts-results';
import { None, Some } from 'ts-results';
import { resourcePrefix } from '../utils';
import { dynamodb } from './clients';

type Item<Content> = { key: string } & Content;

const tableName = `${resourcePrefix}default`;
export class TinyStorage<Content> {
  constructor(
    public key: string,
  ) {}

  async get(): Promise<Option<Item<Content>>> {
    const result = await dynamodb.send(new GetCommand({
      /* eslint-disable @typescript-eslint/naming-convention */
      TableName: tableName,
      Key: {
        key: this.key,
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    }));

    return result.Item === undefined ?
      None :
      Some(result.Item as Item<Content>);
  }

  async set(value: Content): Promise<void> {
    await dynamodb.send(new PutCommand({
      /* eslint-disable @typescript-eslint/naming-convention */
      TableName: tableName,
      Item: {
        key: this.key,
        ...value,
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    }));
  }
}
