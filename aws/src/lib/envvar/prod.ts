import AWS from 'aws-sdk';
import 'source-map-support/register';
import { EnvVar } from './base';

class EnvVarProd implements EnvVar {
    ssm = new AWS.SSM();
    cache = new Map<string, Promise<string>>();

    private async fetch(key: string): Promise<string> {
        const res = await this.ssm.getParameter({
            Name: `/ap2020bot/${key}`,
            WithDecryption: true,
        }).promise();
        const value = res.Parameter.Value;
        return value;
    }

    async get(key: string): Promise<string> {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const promise: Promise<string> = this.fetch(key);
        this.cache.set(key, promise);
        return promise;
    }
}

export const envvarProd = new EnvVarProd();
