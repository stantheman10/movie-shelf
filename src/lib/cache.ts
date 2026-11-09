type Entry<T> = { value: T; expires: number };

/** Small in-memory TTL cache with a size cap and de-duplication of concurrent loads. */
export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private max = 500, private now: () => number = Date.now) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expires <= this.now()) { this.store.delete(key); return undefined; }
    return e.value;
  }

  set(key: string, value: T, ttlMs: number) {
    this.store.delete(key);
    this.store.set(key, { value, expires: this.now() + ttlMs });
    while (this.store.size > this.max) this.store.delete(this.store.keys().next().value as string);
  }

  /** Returns the cached value, or runs `load` once even if called concurrently. Failures are not cached. */
  wrap(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return Promise.resolve(hit);
    let p = this.inflight.get(key);
    if (!p) {
      p = load()
        .then((v) => { this.set(key, v, ttlMs); return v; })
        .finally(() => this.inflight.delete(key));
      this.inflight.set(key, p);
    }
    return p;
  }
}
