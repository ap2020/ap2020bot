// TODO: type keys

export const envVarKeys = [
    "user-agent",
    "utokyo-proxy/host",
    "utokyo-proxy/port",
    "utokyo-proxy/username",
    "utokyo-proxy/password",
    "slack/signing-secret",
    "slack/token/bot",
    "slack/channel/notify-temp",
    "slack/user_id/bot",
] as const;

export type EnvVarKey = typeof envVarKeys[number];

export type EnvVar = {
    get<Key extends EnvVarKey>(key: Key): Promise<string>;
};
