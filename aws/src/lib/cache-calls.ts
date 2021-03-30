export const cacheCalls = <A extends unknown[], B, K extends string | number>(
  func: (...args: A) => Promise<B>,
  getKey: (...args: A) => K, cache: Map<K, Promise<B>> = new Map<K, Promise<B>>()
): (...args: A) => Promise<B> =>
  (new class {
    cache: Map<K, Promise<B>> = cache;
    call = async (...args: A): Promise<B> => {
      const key = getKey(...args);
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const resPromise = func(...args);
      this.cache.set(key, resPromise);
      return resPromise;
    };
  }()).call;
