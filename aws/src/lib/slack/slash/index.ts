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

    const body = event.isBase64Encoded ?
      Buffer.from(event.body, 'base64').toString() :
      event.body;

    // TODO: use SQS to avoid timeout
    // verify をしたので，スキーマを満たしていることが保証される
    await main(querystring.parse(body) as SlashParams);

    return '';
  };

