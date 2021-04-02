import moment from 'moment-timezone';
import { momentToSlackTS, slackTSToMoment } from './timestamp';

describe('dateToSlackTS', () => {
  it('converts Date object to timestamp', () => {
    expect(momentToSlackTS(moment(1234567890123).tz('Asia/Tokyo'))).toBe('1234567890.123000');
  });
});

describe('slackTSToDate', () => {
  it('converts timestamp to Date object', () => {
    expect(slackTSToMoment('1234567890.123000')).toEqual(moment(1234567890123).tz('Asia/Tokyo'));
  });
});
