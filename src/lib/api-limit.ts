import { clientIp, createRateLimiter } from "./rate-limit";

type Options = { perIp: number; global: number; windowMs: number; now?: () => number };

const guarded = (pathname: string) => pathname === "/api/search" || pathname.startsWith("/api/movie/");

/**
 * Protects the TMDB-backed routes. The global cap is a backstop: client IP headers can be
 * spoofed, so no single caller can burn the whole quota even by rotating them.
 */
export function createApiLimiter({ perIp, global, windowMs, now }: Options) {
  const byIp = createRateLimiter({ limit: perIp, windowMs, now });
  const all = createRateLimiter({ limit: global, windowMs, now });

  return (request: Request, pathname: string): Response | null => {
    if (!guarded(pathname)) return null;
    const r = byIp(clientIp(request.headers));
    const g = r.ok ? all("all") : r;
    if (r.ok && g.ok) return null;
    return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(g.retryAfter) },
    });
  };
}
