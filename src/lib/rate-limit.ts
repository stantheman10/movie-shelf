export type RateLimitResult = { ok: boolean; retryAfter: number };

type Options = { limit: number; windowMs: number; now?: () => number };

/** In-memory sliding-window limiter. State is per process, which suits a single Render instance. */
export function createRateLimiter({ limit, windowMs, now = Date.now }: Options) {
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  return (key: string): RateLimitResult => {
    const t = now();
    const cutoff = t - windowMs;
    if (t - lastSweep > windowMs) {
      for (const [k, times] of hits) if (times[times.length - 1] <= cutoff) hits.delete(k);
      lastSweep = t;
    }
    const recent = (hits.get(key) ?? []).filter((x) => x > cutoff);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000)) };
    }
    recent.push(t);
    hits.set(key, recent);
    return { ok: true, retryAfter: 0 };
  };
}

/** Best-effort client IP behind Render / Cloudflare. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
