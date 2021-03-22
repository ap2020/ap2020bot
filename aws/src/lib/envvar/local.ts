import envvarObj from '@/../.env.local.json';
import { EnvVar, EnvVarKey } from './base';

class EnvVarLocal implements EnvVar {
  envvars: Map<EnvVarKey, string> = new Map(Object.entries(envvarObj).map(([k, v]) => [k as EnvVarKey, v.toString()]));

  get<Key extends EnvVarKey>(key: Key) {
    return Promise.resolve(this.envvars.get(key));
  }
}

export const envvarLocal = new EnvVarLocal();
