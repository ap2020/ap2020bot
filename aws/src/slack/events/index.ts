import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { verify } from '@/lib/slack/verify';
import { EventPayload } from '../../lib/slack/events/types';
import { extractAttribute } from './attribute';
import { getSlackEventTopicARN } from '@/lib/slack/events';
import { sns } from '@/lib/sns';

// TODO: preload envvars
export const handler: APIGatewayProxyHandlerV2 = async (request) => {
    if (!(await verify(request))) {
        console.error('Slack verification failed.', request)
        return {
            statusCode: 400,
            body: 'invalid request',
        };
    }
    
    // verifyをしたので、payload は EventPayload の値であることが保証される
    const payload = JSON.parse(request.body);

    switch (payload.type) {
        case "url_verification":
            console.log('Challenge from Slack');
            return payload.challenge;
        case "event_callback":
            await main(payload);
            break;
        default:
            console.error('not recognized top-level event: ', payload.type);
    }

    return {
        statusCode: 200,
        body: '',
    };;
};

const main = async (payload: EventPayload) => {
    const message = payload;
    const messageAttributes = extractAttribute(payload);
    // TODO: exclude events by bots
    await sns.publish({
        TopicArn: await getSlackEventTopicARN(),
        Message: JSON.stringify(message),
        MessageAttributes: messageAttributes,
        // MessageDeduplicationId: payload.event_id, // type definition of sns.publish is incomplete…
    }).promise()
}
