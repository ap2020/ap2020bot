export class CaseInsensitiveMap<Value> {
  private loweredMap: Map<string, Value>;

  constructor(map: Map<string, Value>) {
    this.loweredMap = new Map(
      [...map.entries()].map(([key, value]) => [key.toLowerCase(), value])
    );
  }

  get(key: string): Value | undefined {
    return this.loweredMap.get(key.toLowerCase());
  }

  has(key: string): boolean {
    return this.loweredMap.has(key.toLowerCase());
  }

  set(key: string, value: Value) {
    this.loweredMap.set(key.toLowerCase(), value);
  }

  static fromObject<Value>(obj: {[key: string]: Value}): CaseInsensitiveMap<Value> {
    return new CaseInsensitiveMap<Value>(new Map(Object.entries(obj)));
  }
}
