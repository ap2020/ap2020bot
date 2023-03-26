import { promises as fs } from 'fs';
import assert from 'assert';
import path from 'path';
import type { JsonValue } from 'type-fest';
import type { EnvVar, EnvVarKey } from './base';

class EnvVarLocal implements EnvVar {
  envvars: Map<EnvVarKey, string> | null = null;

  async loadEnv() {
    const envvarObj = JSON.parse(await fs.readFile(
      path.join(
        // eslint-disable-next-line unicorn/prefer-module
        __dirname, // envvar
        '..', // lib
        '..', // src
        '..', // aws
        '.env.local.json',
      ),
      { encoding: 'utf-8' },
    )) as JsonValue;
    assert(envvarObj instanceof Object);
    this.envvars = new Map(
      Object.entries(envvarObj).map(([key, v]) => {
        assert(typeof v === 'string');
        return [key as EnvVarKey, v];
      }),
    );
  }

  async get<Key extends EnvVarKey>(key: Key) {
    if (this.envvars === null) {
      await this.loadEnv();
      assert(this.envvars !== null);
    }
    const value = this.envvars.get(key);
    assert(value !== undefined);
    return Promise.resolve(value);
  }
}

export const envvarLocal = new EnvVarLocal();
