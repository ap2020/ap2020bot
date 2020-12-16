import { SlackEvent } from "./slack-types";
import { MessageAttributeMap, MessageAttributeValue } from "aws-sdk/clients/sns";
import { EventPayload } from "./slack-types";

const toAttr = (str: string): MessageAttributeValue => {
  return {
    DataType: 'String',
    StringValue: str,
  }
}

type ExtractEventSpecificAttributeFunc<Kind extends SlackEvent['type']> = (event: Extract<SlackEvent, {type: Kind}>) => MessageAttributeMap;

const extractAttributeFromKeys = <V, Keys extends keyof V & string[]>(obj: V, keys: Keys): MessageAttributeMap => {
  return Object.fromEntries(keys.map(key => [key, toAttr(obj[key])]))
}

const extractEventSpecificAttribute /*:  {[key in SlackEvent['type']]?: ExtractEventSpecificAttributeFunc<key>} */ = {
  // 'message': (event) => extractAttributeFromKeys(event, ['channel', 'user', 'text'])
} as const;

export const extractAttribute = (payload: EventPayload): MessageAttributeMap => {
    const commonAttribute = {
      team_id: toAttr(payload.team_id),
      type: toAttr(payload.event.type),
    }
    if (payload.event.type in extractEventSpecificAttribute) {
      return {
        ...commonAttribute,
        ...extractEventSpecificAttribute[payload.event.type](payload.event),
      }
    } else {
      return commonAttribute;
    }
}
