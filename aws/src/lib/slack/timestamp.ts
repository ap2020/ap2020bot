import { DateTime } from 'luxon';

export const datetimeToSlackTS = (date: DateTime): string =>
  (date.toMillis() / 1000).toFixed(6);

export const slackTSToDateTime = (ts: string): DateTime =>
  DateTime.fromMillis(Number(ts) * 1000).setZone('Asia/Tokyo');
