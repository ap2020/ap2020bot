import { promises as fs } from 'fs';
import path from 'path';
import { EnvVar } from './base';

export class EnvVarLocal implements EnvVar {
    envvars: Map<string, string> | null = null;

    private async loadEnv() {
        const text = await fs.readFile(
            path.join(
                __dirname, // func-name
                '..', // src
                '..', // service
                '..', // webpack
                '.env.local.json',
            ),
            { encoding: 'utf8' },
        );
        this.envvars = new Map(Object.entries(JSON.parse(text)).map(([k, v]) => [k, v.toString()]));
    }

    async get(key: string) {
        if (this.envvars === null) {
            await this.loadEnv();
        }
        return this.envvars.get(key);
    }
}
