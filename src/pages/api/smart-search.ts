import type { APIRoute } from "astro";
import { getUserId } from "../../lib/auth";
import { tmdb, json } from "../../lib/tmdb";
import { smartSearch } from "../../lib/smart-search";

const MAX_QUERY = 300;

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await getUserId(request))) return json({ error: "Sign in required" }, 401);
  const q = url.searchParams.get("q")?.trim().slice(0, MAX_QUERY);
  if (!q) return json({ results: [], page: 1, totalPages: 0 });
  try {
    const results = await smartSearch(q);
    return json({ results, page: 1, totalPages: 1 });
  } catch {
    // LLM unavailable, slow, rate-limited or unusable: degrade to plain title search.
    try {
      const r = await tmdb("/search/multi", { query: q.slice(0, 100), page: "1" });
      return json({
        fallback: true, page: 1, totalPages: 1,
        results: r.results
          .filter((m: any) => m.media_type === "movie" || m.media_type === "tv")
          .map((m: any) => ({
            id: m.id, mediaType: m.media_type, title: m.title ?? m.name,
            release_date: m.release_date ?? m.first_air_date,
            poster_path: m.poster_path, overview: m.overview,
          })),
      });
    } catch (e: any) {
      return json({ error: e.message }, 502);
    }
  }
};
