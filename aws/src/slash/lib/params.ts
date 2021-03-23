/* eslint-disable @typescript-eslint/naming-convention */
// ignore rule because Slack choosed this

export type SlashParams = {
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
};
