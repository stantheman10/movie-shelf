import type { APIRoute } from "astro";
import { tmdb, json } from "../../lib/tmdb";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim();
  if (!q) return json([]);
  try {
    const r = await tmdb("/search/movie", { query: q });
    return json(
      r.results.map((m: any) => ({
        id: m.id, title: m.title, release_date: m.release_date,
        poster_path: m.poster_path, overview: m.overview,
      }))
    );
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};
