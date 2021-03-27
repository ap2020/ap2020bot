import assert from 'assert';
import type { EnvVar, EnvVarKey } from './base';

class EnvVarTest implements EnvVar {
  envvars = new Map<EnvVarKey, string>();

  init() {
    this.envvars.clear();
  }

  set(key: EnvVarKey, value: string) {
    this.envvars.set(key, value);
  }

  get(key: EnvVarKey) {
    const value = this.envvars.get(key);
    assert(value !== undefined);
    return Promise.resolve(value);
  }
}

export const envvarTest = new EnvVarTest();
