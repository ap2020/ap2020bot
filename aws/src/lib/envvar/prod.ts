import AWS from 'aws-sdk';
import 'source-map-support/register';
import { EnvVar, EnvVarKey } from './base';

class EnvVarProd implements EnvVar {
  ssm = new AWS.SSM();
  cache = new Map<EnvVarKey, Promise<string>>();

  private async fetch(key: EnvVarKey): Promise<string> {
    const res = await this.ssm.getParameter({
      /* eslint-disable @typescript-eslint/naming-convention */
      Name: `/ap2020bot/${process.env.STAGE}/${key}`,
      WithDecryption: true,
      /* eslint-enable @typescript-eslint/naming-convention */
    }).promise();
    const value = res.Parameter.Value;
    return value;
  }

  async get(key: EnvVarKey): Promise<string> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const promise: Promise<string> = this.fetch(key);
    this.cache.set(key, promise);
    return promise;
  }
}

export const envvarProd = new EnvVarProd();
