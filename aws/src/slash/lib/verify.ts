import crypto from 'crypto';
import timingSafeCompare from 'tsscmp';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { envvar } from '@/lib/envvar';

export const verify = async (req: APIGatewayProxyEventV2): Promise<boolean> => {
    const version = 'v0';
    const actual = req.headers['X-Slack-Signature'];
    if (actual === undefined) {
        return false;
    }
    const timestamp = req.headers['X-Slack-Request-Timestamp'];
    if (timestamp === undefined) {
        return false;
    }
    const hmac = crypto.createHmac('sha256', await envvar.get('slack/signing-secret'));
    hmac.update(`${version}:${timestamp}:${req.body}`);
    const expected = `${version}=${hmac.digest('hex')}`;

    return timingSafeCompare(expected, actual);
};
