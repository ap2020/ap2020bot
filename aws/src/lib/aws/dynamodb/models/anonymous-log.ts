import {
  attribute,
  hashKey,
  rangeKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('anonymous-log')
export class AnonymousLog {
  @hashKey()
  channelID!: string;

  @rangeKey()
  timestamp!: string;

  @attribute()
  userID!: string;
}
