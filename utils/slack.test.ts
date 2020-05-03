import {dateToSlackTS} from './slack';

describe('dateToSlackTS', () => {
    it('converts Date object to timestamp', () => {
        expect(dateToSlackTS(new Date(1234567890123))).toBe('1234567890.123');
    });
});
