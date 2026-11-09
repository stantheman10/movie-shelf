import type { APIRoute } from "astro";
import { tmdb, json } from "../../lib/tmdb";

const MAX_QUERY = 100;
const MAX_PAGE = 500; // TMDB's own limit

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim().slice(0, MAX_QUERY);
  if (!q) return json({ results: [], page: 1, totalPages: 0 });
  const page = Math.min(Math.max(parseInt(url.searchParams.get("page") ?? "", 10) || 1, 1), MAX_PAGE);
  try {
    const r = await tmdb("/search/multi", { query: q, page: String(page) });
    return json({
      page: r.page,
      totalPages: Math.min(r.total_pages ?? 0, MAX_PAGE),
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
};
