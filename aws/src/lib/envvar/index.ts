import { EnvVar } from './base';
import { envvarProd } from './prod';
/// #if STAGE === 'local'
import { envvarTest } from './test';
import { envvarLocal } from './local';
/// #endif
// Do not bundle local envvar module because this depends on file .env.local.json,
// which does not exist on CI.
// This also prevents deploying bundle including contents of .env.local.json
// from local environment.


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
