import { google } from 'googleapis';
import { envvar } from '../envvar';

export const googleAuth = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      /* eslint-disable @typescript-eslint/naming-convention */
      client_email: await envvar.get('google/auth/client-email'),
      private_key: await envvar.get('google/auth/private-key'),
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.activity.readonly',
    ],
  });
  return auth;
};
