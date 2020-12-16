import crypto from 'crypto';
import timingSafeCompare from 'tsscmp';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { envvar } from '@/lib/envvar';

const logInvalidRequest = (req: APIGatewayProxyEventV2, message: string) => {
    console.error('Slack signature verification failed.', message, req.requestContext.http.sourceIp, req.requestContext.http.userAgent);
}

export const verify = async (req: APIGatewayProxyEventV2): Promise<boolean> => {
    const version = 'v0';
    const actual = req.headers['X-Slack-Signature'];
    if (actual === undefined) {
        logInvalidRequest(req, 'X-Slack-Signature not set.');
        return false;
    }
    const timestamp = req.headers['X-Slack-Request-Timestamp'];
    if (timestamp === undefined) {
        logInvalidRequest(req, 'X-Slack-Request-Timestamp not set.');
        return false;
    }
    // TODO: time check
    const hmac = crypto.createHmac('sha256', await envvar.get('slack/signing-secret'));
    hmac.update(`${version}:${timestamp}:${req.body}`);
    const expected = `${version}=${hmac.digest('hex')}`;

    const ok = timingSafeCompare(expected, actual);
    if (!ok) {
        logInvalidRequest(req, 'Signature did not match.');s
    }
    return ok;
};
