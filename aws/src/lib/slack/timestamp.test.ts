import { DateTime } from 'luxon';
import { momentToSlackTS, slackTSToMoment } from './timestamp';

describe('dateToSlackTS', () => {
  it('converts Date object to timestamp', () => {
    expect(momentToSlackTS(DateTime.fromMillis(1234567890123).setZone('Asia/Tokyo'))).toBe('1234567890.123000');
  });
});

describe('slackTSToDate', () => {
  it('converts timestamp to Date object', () => {
    expect(slackTSToMoment('1234567890.123000')).toEqual(DateTime.fromMillis(1234567890123).setZone('Asia/Tokyo'));
  });
});
