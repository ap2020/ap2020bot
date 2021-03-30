// TODO: type keys

export const envVarKeys = [
  'aws/account-id',
  'utokyo-proxy/host',
  'utokyo-proxy/port',
  'utokyo-proxy/username',
  'utokyo-proxy/password',
  'google/auth/client-email',
  'google/auth/private-key',
  'google/group/ap2020',
  'google/drive/item/ap2020files',
  'google/drive/item/lms',
  'google/drive/ignored-items',
  'slack/signing-secret',
  'slack/token/bot',
  'slack/channel/notify-others',
  'slack/channel/notify-temp',
  'slack/channel/notify-drive',
  'slack/channel/notify-drive-lms',
  'slack/channel/inshi-ist',
  'slack/user_id/bot',
] as const;

export type EnvVarKey = typeof envVarKeys[number];

export type EnvVar = {
  get<Key extends EnvVarKey>(key: Key): Promise<string>;
};
