import type { EnvVar } from './base';
import { envvarProd } from './prod';
import { envvarTest } from './test';
import { envvarLocal } from './local';
import { isReal, stage } from '../stages';
import { proveUnreachable } from '../utils';

export const envvar: EnvVar = (() => {
  if (isReal(stage)) {
    return envvarProd;
  } else if (stage === 'local') {
    return envvarLocal;
  } else if (stage === 'test') {
    return envvarTest;
  } else {
    return proveUnreachable(stage);
  }
})();
