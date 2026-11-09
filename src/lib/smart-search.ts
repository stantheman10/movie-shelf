import { tmdb } from "./tmdb";
import { TtlCache } from "./cache";
import { suggestTitles, type Suggestion } from "./llm";

export type SmartResult = {
  id: number; mediaType: "movie" | "tv"; title: string; release_date?: string;
  poster_path: string | null; overview?: string; reason: string;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new TtlCache<SmartResult[]>(300);

export const normTitle = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/^(the|a|an) /, "");

/** Strict match: near-exact normalized title and release year within ±1. */
export function matches(s: Suggestion, hit: any): boolean {
  const date: string = hit.release_date ?? hit.first_air_date ?? "";
  const year = parseInt(date.slice(0, 4), 10);
  if (!year || Math.abs(year - s.year) > 1) return false;
  const want = normTitle(s.title);
  return [hit.title, hit.name, hit.original_title, hit.original_name]
    .some((t) => typeof t === "string" && normTitle(t) === want);
}

async function resolve(s: Suggestion): Promise<SmartResult | null> {
  const r = await tmdb(s.type === "tv" ? "/search/tv" : "/search/movie", { query: s.title });
  const hit = (r.results ?? []).find((h: any) => matches(s, h));
  if (!hit) return null;
  return {
    id: hit.id, mediaType: s.type, title: hit.title ?? hit.name,
    release_date: hit.release_date ?? hit.first_air_date,
    poster_path: hit.poster_path ?? null, overview: hit.overview, reason: s.reason,
  };
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n]); }
  }));
  return out;
}

/** Throws when the LLM fails or nothing resolves, so the caller can fall back to normal search. */
export function smartSearch(query: string): Promise<SmartResult[]> {
  const key = query.toLowerCase().replace(/\s+/g, " ").trim();
  return cache.wrap(key, TTL_MS, async () => {
    const { anchor, items } = await suggestTitles(query);
    const anchorNorm = anchor ? normTitle(anchor) : null;
    const wanted = items.filter((s) => normTitle(s.title) !== anchorNorm);
    const settled = await pool(wanted, 5, (s) => resolve(s).catch(() => null));
    const seen = new Set<string>();
    const results = settled.filter((r): r is SmartResult => {
      if (!r) return false;
      const k = r.mediaType + ":" + r.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!results.length) throw new Error("No suggestions could be matched");
    return results;
  });
}
