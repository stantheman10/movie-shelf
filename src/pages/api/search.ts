import type { APIRoute } from "astro";
import { tmdb, json } from "../../lib/tmdb";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim();
  if (!q) return json([]);
  try {
    const r = await tmdb("/search/multi", { query: q });
    return json(
      r.results
        .filter((m: any) => m.media_type === "movie" || m.media_type === "tv")
        .map((m: any) => ({
          id: m.id, mediaType: m.media_type, title: m.title ?? m.name,
          release_date: m.release_date ?? m.first_air_date,
          poster_path: m.poster_path, overview: m.overview,
        }))
    );
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};
