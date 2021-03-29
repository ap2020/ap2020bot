import querystring from 'querystring';
import assert from 'assert';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { SlashParams } from '@/slash/lib/params';
import { verify } from '../verify';

export type SlashMainFunc = (params: SlashParams) => Promise<void>;

export const createHandler = (main: SlashMainFunc): APIGatewayProxyHandlerV2 =>
  async (event) => {
    if (!(await verify(event))) {
      return {
        statusCode: 400,
        body: 'invalid request',
      };
    }

    assert(event.body !== undefined);

    // TODO: use SQS to avoid timeout
    // verify をしたので，スキーマを満たしていることが保証される
    await main(querystring.parse(event.body) as SlashParams);

    return '';
  };

