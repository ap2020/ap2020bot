import { EnvVar } from './base';
import { envvarProd } from './prod';
/// #if STAGE !== 'local'
import { envvarTest } from './test';
import { envvarLocal } from './local';
/// #endif
// do not bundle local envvar module because this depends on .env.local.json

export const envvar: EnvVar = (() => {
    switch (process.env.STAGE) {
        case 'prod': {
            return envvarProd;
        }
        /// #if STAGE === 'local'
        case 'test': {
            return envvarTest;
        }
        default: {
            return envvarLocal;
        }
        /// #endif
    }
})();
