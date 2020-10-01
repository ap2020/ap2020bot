import envvarObj from '@/../.env.local.json'
import { EnvVar } from './base';

export class EnvVarLocal implements EnvVar {
    envvars: Map<string, string> = new Map(Object.entries(envvarObj).map(([k, v]) => [k, v.toString()]));

    get(key: string) {
        return Promise.resolve(this.envvars.get(key));
    }
}
