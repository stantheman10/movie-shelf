import type { APIRoute } from "astro";
import { tmdb, json } from "../../lib/tmdb";
import { toResult } from "../../lib/results";

const ONE_HOUR = 3600;

export const GET: APIRoute = async () => {
  try {
    const [movies, tv] = await Promise.all([
      tmdb("/trending/movie/week", {}, ONE_HOUR),
      tmdb("/trending/tv/week", {}, ONE_HOUR),
    ]);
    return json({
      movies: movies.results.map((m: any) => toResult(m, "movie")),
      tv: tv.results.map((m: any) => toResult(m, "tv")),
    });
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};
