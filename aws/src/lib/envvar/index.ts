import { EnvVar } from './base';
import { EnvVarProd } from './prod';
/// #if STAGE !== 'local'
import { EnvVarTest } from './test';
import { EnvVarLocal } from './local';
/// #endif
// do not bundle local envvar module because this depends on .env.local.json

export const envvar: EnvVar = (() => {
    switch (process.env.STAGE) {
        case 'prod': {
            return new EnvVarProd();
        }
        /// #if STAGE === 'local'
        case 'test': {
            return new EnvVarTest();
        }
        default: {
            return new EnvVarLocal();
        }
        /// #endif
    }
})();
