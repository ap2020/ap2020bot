import { DateTime } from 'luxon';
import { datetimeToSlackTS, slackTSToDateTime } from './timestamp';

describe('datetimeToSlackTS', () => {
  it('converts Date object to timestamp', () => {
    // eslint-disable-next-line unicorn/numeric-separators-style
    expect(datetimeToSlackTS(DateTime.fromMillis(1234567890123).setZone('Asia/Tokyo'))).toBe('1234567890.123000');
  });
});

describe('slackTSToDateTime', () => {
  it('converts timestamp to Date object', () => {
    // eslint-disable-next-line unicorn/numeric-separators-style
    expect(slackTSToDateTime('1234567890.123000')).toEqual(DateTime.fromMillis(1234567890123).setZone('Asia/Tokyo'));
  });
});
