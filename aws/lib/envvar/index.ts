import { EnvVar } from './base';
import { EnvVarProd } from './prod';
import { EnvVarLocal } from './local';
import { EnvVarTest } from './test';

export const envvar: EnvVar = (() => {
    switch (process.env.STAGE) {
        case 'prod': {
            return new EnvVarProd();
        }
        case 'test': {
            return new EnvVarTest();
        }
        default: {
            return new EnvVarLocal();
        }
    }
})();
