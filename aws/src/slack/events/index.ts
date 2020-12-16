import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { verify } from '@/lib/slack/verify';
import { SNS } from 'aws-sdk';
import { EventPayload } from './slack-types';
import { extractAttribute } from './attribute';
import { getSlackEventTopicARN } from '@/lib/slack/events';

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
            console.log(JSON.stringify(payload, undefined, 2));
            // await main(payload);
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
    const sns = new SNS();
    const message = payload;
    const messageAttributes = extractAttribute(payload);
    await sns.publish({
        TopicArn: await getSlackEventTopicARN(),
        Message: JSON.stringify(message),
        MessageAttributes: messageAttributes,
        // MessageDeduplicationId: payload.event_id, // type definition of sns.publish is incomplete…
    }).promise()
}
