import { google } from 'googleapis';

export type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export const getGoogleClient = (): OAuth2Client => {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const auth = new google.auth.OAuth2(client_id, client_secret);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
};
