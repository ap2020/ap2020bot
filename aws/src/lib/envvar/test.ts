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
    return Promise.resolve(this.envvars.get(key));
  }
}

export const envvarTest = new EnvVarTest();
