import type { Option } from 'ts-results';
import { None, Some } from 'ts-results';
import { resourcePrefix } from '../utils';
import { dynamodb } from './clients';

export type DefaultTableContent = {
  'watch-drive': { lastChecked: number };
  'watch-portal': { urls: string[] };
};

export type DefaultTableKey = keyof DefaultTableContent;

export type DefaultTableContentWithKey<Key extends DefaultTableKey> = (
  & DefaultTableContent[Key]
  & { key: Key }
);

const tableName = `${resourcePrefix}default`;
export const defaultTable = {
  async get<Key extends DefaultTableKey>(key: Key): Promise<Option<DefaultTableContentWithKey<Key>>> {
    const result = await dynamodb.get({
      /* eslint-disable @typescript-eslint/naming-convention */
      TableName: tableName,
      Key: {
        key,
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    }).promise();
    return result.Item === undefined ?
      None :
      Some(result.Item as DefaultTableContentWithKey<Key>);
  },

  async set<Key extends DefaultTableKey>(key: Key, value: DefaultTableContent[Key]): Promise<void> {
    await dynamodb.put({
      /* eslint-disable @typescript-eslint/naming-convention */
      TableName: tableName,
      Item: {
        key,
        ...value,
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    }).promise();
  },
};
