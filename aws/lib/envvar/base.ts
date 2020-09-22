// TODO: type keys
export type IEnvVar = {
    get(key: string): Promise<string>;
};
