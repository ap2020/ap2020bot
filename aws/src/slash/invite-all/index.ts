import crypto from 'crypto';
import querystring from 'querystring';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import timingSafeCompare from 'tsscmp';
import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import { WebAPICallResult } from '@slack/web-api';

const verify = async (req: APIGatewayProxyEventV2): Promise<boolean> => {
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

type SlashRequest = {
    // token: string; // DEPRECATED
    team_id: string;
    team_domain: string;
    enterprise_id: string;
    // enterprise_name: string; // _id is more reliable
    channel_id: string;
    // channel_name: string; // _id is more reliable
    user_id: string;
    // user_name: string; // phased out
    command: string; // '/hoge'
    text: string;
    response_url: string;
    trigger_id: string;
}

// TODO: ライブラリに切り出す
type Member = {
    id: string;
}

const main = async (req: SlashRequest) => {
    // TODO: 引数にチャンネル名をとり，ワークスペース全員ではなく，チャンネルのメンバー全員を招待する
    // TODO: 元のeslintルールに反映
    // eslint-disable-next-line no-restricted-syntax
    for await (const page of (await slack.bot).paginate('users.list')) {
        const { members } = page as WebAPICallResult & {members: Member[]};
        const botId = await envvar.get('slack/user_id/bot');
        await (await slack.bot).conversations.invite({
            channel: req.channel_id,
            users: members.filter(({ id }) => id !== botId).map(({ id }) => id).join(','),
        });
    }
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    if (!(await verify(event))) {
        return 'invalid request';
    }
    // verify をしたので，スキーマを満たしていることが保証される
    await main(querystring.parse(event.body) as SlashRequest);
    return '';
};
