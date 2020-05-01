import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as handlers from "./handlers";
import crypto from "crypto";
import timingSafeCompare from "tsscmp";

const verify = (req: HttpRequest) => {
    const version = 'v0';
    const actual = req.headers['x-slack-signature'];

    const timestamp = req.headers['x-slack-request-timestamp'];
    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET);
    hmac.update(`${version}:${timestamp}:${req.rawBody}`);
    const expected = `${version}=${hmac.digest('hex')}`;

    return timingSafeCompare(expected, actual);
}

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
    if (!verify(req)) {
        context.log.error('unverified request from:', req.headers['x-forwarded-for']);
        context.res = {
            body: "",
        };
        return;
    }
    switch (req.body.type) {
        case "url_verification":
            context.log('Challenge from Slack');
            context.res = {
                body: req.body.challenge,
            }
            return;
        case "event_callback":
            let eventType = req.body.event.type
            context.log('Incoming event: ', eventType);
            context.res = {
                body: "",
            };
            context.done(); // easy return because of the 3sec rule
            if (eventType in handlers) {
                // TODO: handle errors
                await handlers[eventType](req.body.event, context);
            } else {
                context.log.error('no handler for event type:', eventType);
            }
            break;
        default:
            context.log.error('not recognized top-level event: ', req.body.type);
    }
};

export default httpTrigger;
