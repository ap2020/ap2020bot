export const cacheCalls =
    <A extends unknown[], B, K extends string | number>
    (
        func: (...args: A) => Promise<B>,
        getKey: (...args: A) => K,
        cache: Map<K, Promise<B>> = new Map(),
    ): (...args: A) => Promise<B> =>
        (
            new class {
                cache: Map<K, Promise<B>> = cache;
                call = async (...args: A): Promise<B> => {
                    const key = getKey(...args);
                    if (this.cache.has(key)) {
                        return this.cache.get(key);
                    }
                    const resPromise = func(...args);
                    this.cache.set(key, resPromise);
                    return resPromise;
                }
            }()
        ).call;
