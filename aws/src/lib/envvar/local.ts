import envvarObj from '@/../.env.local.json';
import assert from 'assert';
import type { EnvVar, EnvVarKey } from './base';

class EnvVarLocal implements EnvVar {
  envvars: Map<EnvVarKey, string> = new Map(Object.entries(envvarObj).map(([k, v]) => [k as EnvVarKey, v.toString()]));

  get<Key extends EnvVarKey>(key: Key) {
    const value = this.envvars.get(key);
    assert(value !== undefined);
    return Promise.resolve(value);
  }
}

export const envvarLocal = new EnvVarLocal();
