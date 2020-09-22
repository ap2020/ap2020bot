import { IEnvVar } from './base';
import { EnvVarProd } from './prod';
import { EnvVarLocal } from './local';

export const EnvVar: new () => IEnvVar = (() => {
    switch (process.env.STAGE) {
        case 'prod': {
            return EnvVarProd;
        }
        // TODO: case 'test'
        default: {
            return EnvVarLocal;
        }
    }
})();
