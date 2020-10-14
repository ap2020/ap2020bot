import { EnvVar } from './base';

class EnvVarTest implements EnvVar {
    envvars = new Map<string, string>();

    init() {
        this.envvars.clear();
    }

    set(key: string, value: string) {
        this.envvars.set(key, value);
    }

    get(key: string) {
        return Promise.resolve(this.envvars.get(key));
    }
}

export const envvarTest = new EnvVarTest();
