import { google } from 'googleapis';
import { envvar } from '../envvar';

export const googleAuth = async (): Promise<InstanceType<typeof google.auth.GoogleAuth>> => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: await envvar.get('google/auth/client-email'),
      private_key: await envvar.get('google/auth/private-key'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive',
    ]
  });
  return auth;
};
