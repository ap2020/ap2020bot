import {cacheCalls} from './utils';

describe('cacheCalls', () => {
    it('caches calls', async () => {
        const slowAsync = jest.fn(async <T>(result: T) => new Promise<T>(resolve => setTimeout(resolve, 100, result))); // slow identity function
        // TODO: type of slowAsync is any
        const cachedFunc = cacheCalls(slowAsync, (k)=>k);
        const res = await Promise.all([cachedFunc(1), cachedFunc(1), cachedFunc(2)]);
        expect(slowAsync.mock.calls.length).toBe(2); // not 3
        expect(res).toEqual([1,1,2]);
    });
});
