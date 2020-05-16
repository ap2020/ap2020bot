import moment, { Moment } from 'moment-timezone';

export const momentToSlackTS = (date: Moment): string =>
    (date.valueOf() / 1000).toFixed(6);

export const slackTSToMoment = (ts: string): Moment =>
    moment(Number(ts) * 1000).tz('Asia/Tokyo');
