import {google} from 'googleapis';

export type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export const getGoogleClient = (): OAuth2Client => {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const {client_secret, client_id, redirect_uris} = credentials.installed;  
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials({refresh_token:process.env.GOOGLE_REFRESH_TOKEN});
    return auth;
}