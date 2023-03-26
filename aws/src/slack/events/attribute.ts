import type { EventPayload } from '@/lib/slack/events/types';
import type { MessageAttributeValue } from '@aws-sdk/client-sns';

type MessageAttributeMap = Record<string, MessageAttributeValue>;

const toAttr = (str: string): MessageAttributeValue => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  DataType: 'String',
  StringValue: str,
  /* eslint-enable @typescript-eslint/naming-convention */
});

// type ExtractEventSpecificAttributeFunc<Kind extends SlackEvent['type']> =
//   (event: Extract<SlackEvent, {type: Kind}>) => MessageAttributeMap;

// const extractAttributeFromKeys = <V, Keys extends keyof V & string[]>(obj: V, keys: Keys): MessageAttributeMap => {
//   return Object.fromEntries(keys.map(key => [key, toAttr(obj[key])]))
// }

// const extractEventSpecificAttribute:  {[key in SlackEvent['type']]?: ExtractEventSpecificAttributeFunc<key>} = {
//   'message': (event) => extractAttributeFromKeys(event, ['channel', 'user', 'text'])
// } as const;

export const extractAttribute = (payload: EventPayload): MessageAttributeMap => {
  const commonAttribute = {
    /* eslint-disable @typescript-eslint/naming-convention */
    team_id: toAttr(payload.team_id),
    event_name: toAttr(payload.event.type),
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  // if (payload.event.type in extractEventSpecificAttribute) {
  //   return {
  //     ...commonAttribute,
  //     ...extractEventSpecificAttribute[payload.event.type](payload.event),
  //   };
  // }
  return commonAttribute;
};
