// TODO: type keys
export type EnvVar = {
    get(key: string): Promise<string>;
};
