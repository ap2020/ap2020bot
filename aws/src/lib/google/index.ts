import { google } from 'googleapis';

export type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export const googleAuth = async (): Promise<OAuth2Client> => {
  const clientID = process.env.GOOGLE_CLIENT_ID; // TODO: use ssm
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const auth = new google.auth.OAuth2(clientID, clientSecret);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
};
