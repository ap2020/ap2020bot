import {promisify} from 'util';
import {cacheCalls} from './utils';

const slowAsync_ = async <T>(result: T) => {await promisify(process.nextTick)(); return result}; // async identity function

describe('cacheCalls', () => {
    it('caches calls', async () => {
        const slowAsync = jest.fn(slowAsync_);
        // TODO: type of slowAsync is any
        const cachedFunc = cacheCalls(slowAsync, (k)=>k);
        const res = await Promise.all([cachedFunc(1), cachedFunc(1), cachedFunc(2)]);
        expect(slowAsync.mock.calls.length).toBe(2); // not 3
        expect(res).toEqual([1,1,2]);
    });

    it('uses given initial cache', async () => {
        const slowAsync = jest.fn(slowAsync_); // slow identity function
        // TODO: type of slowAsync is any
        const cachedFunc = cacheCalls(slowAsync, (k)=>k, new Map([[1, Promise.resolve(123)]]));
        const res = await Promise.all([cachedFunc(1), cachedFunc(1), cachedFunc(2)]);
        expect(slowAsync.mock.calls.length).toBe(1); // not 2 or 3
        expect(res).toEqual([123,123,2]);
    });
});
