import { DateTime } from 'luxon';

export const momentToSlackTS = (date: DateTime): string =>
  (date.toMillis() / 1000).toFixed(6);

export const slackTSToMoment = (ts: string): DateTime =>
  DateTime.fromMillis(Number(ts) * 1000).setZone('Asia/Tokyo');
