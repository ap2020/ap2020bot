import assert from 'assert';
import AWS from 'aws-sdk';
import 'source-map-support/register';
import { stage } from '../stages';
import type { EnvVar, EnvVarKey } from './base';

class EnvVarProd implements EnvVar {
  ssm = new AWS.SSM();
  cache = new Map<EnvVarKey, Promise<string>>();

  private async fetch(key: EnvVarKey): Promise<string> {
    const res = await this.ssm.getParameter({
      /* eslint-disable @typescript-eslint/naming-convention */
      Name: `/ap2020bot/${stage}/${key}`,
      WithDecryption: true,
      /* eslint-enable @typescript-eslint/naming-convention */
    }).promise();
    const value = res?.Parameter?.Value;
    assert(value !== undefined);
    return value;
  }

  async get(key: EnvVarKey): Promise<string> {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const promise: Promise<string> = this.fetch(key);
    this.cache.set(key, promise);
    return promise;
  }
}

export const envvarProd = new EnvVarProd();
