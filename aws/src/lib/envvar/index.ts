import type { EnvVar } from './base';
import { envvarProd } from './prod';
import { envvarTest } from './test';
import { envvarLocal } from './local';


export const envvar: EnvVar = (() => {
  switch (process.env.STAGE) {
    case 'prod':
    case 'dev': {
      return envvarProd;
    }
    case 'test': {
      return envvarTest;
    }
    default: {
      return envvarLocal;
    }
  }
})();
