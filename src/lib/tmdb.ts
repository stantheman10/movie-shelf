import { env } from "./env";
import { TtlCache } from "./cache";

const cache = new TtlCache<unknown>(500);

async function fetchTmdb(u: URL) {
  // TMDB intermittently resets connections (ECONNRESET); retry network errors only.
  let r: Response | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      break;
    } catch (e) {
      if (attempt === 5) throw e;
      await new Promise((res) => setTimeout(res, 100 * (attempt + 1)));
    }
  }
  if (!r) throw new Error("TMDB unreachable");
  if (!r.ok) throw new Error(r.status === 401 ? "Invalid TMDB API key" : `TMDB error ${r.status}`);
  return r.json();
}

/** Calls TMDB. Successful responses are cached in memory for `ttlSeconds` (0 disables caching). */
export async function tmdb(path: string, params: Record<string, string> = {}, ttlSeconds = 300) {
  const u = new URL("https://api.themoviedb.org/3" + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const cacheKey = u.pathname + u.search; // built before the API key is added
  u.searchParams.set("api_key", env("TMDB_API_KEY"));
  if (ttlSeconds <= 0) return fetchTmdb(u);
  return cache.wrap(cacheKey, ttlSeconds * 1000, () => fetchTmdb(u));
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
