export const cacheCalls = <A extends unknown[], B, K extends string | number>(
  func: (...args: A) => Promise<B>,
  getKey: (...args: A) => K,
  cachePromise: Promise<Map<K, Promise<B>>> = Promise.resolve(new Map<K, Promise<B>>()),
): (...args: A) => Promise<B> =>
  (new class {
    cachePromise: Promise<Map<K, Promise<B>>> = cachePromise;
    call = async (...args: A): Promise<B> => {
      const cache = await cachePromise;
      const key = getKey(...args);
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const resPromise = func(...args);
      cache.set(key, resPromise);
      return resPromise;
    };
  }()).call;
