import AWS from 'aws-sdk';
import 'source-map-support/register';
import { EnvVar } from './base';

export class EnvVarProd implements EnvVar {
    ssm = new AWS.SSM();
    cache: Map<string, Promise<string>>;

    async get(key: string): Promise<string> {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const res = await this.ssm.getParameter({
            Name: `/ap2020bot/${key}`,
            WithDecryption: true,
        }).promise();
        const value = res.Parameter.Value;
        return value;
    }
}
