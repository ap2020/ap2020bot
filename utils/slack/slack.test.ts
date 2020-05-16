import {dateToSlackTS, slackTSToDate} from './timestamp';

describe('dateToSlackTS', () => {
    it('converts Date object to timestamp', () => {
        expect(dateToSlackTS(new Date(1234567890123))).toBe('1234567890.123');
    });
});

describe('slackTSToDate', () => {
    it('converts timestamp to Date object', () => {
        expect(slackTSToDate('1234567890.123').getTime()).toBe(new Date(1234567890123).getTime());
    });
})
