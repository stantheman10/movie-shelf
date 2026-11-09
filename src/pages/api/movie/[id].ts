import type { APIRoute } from "astro";
import { tmdb, json } from "../../../lib/tmdb";

export const GET: APIRoute = async ({ params, request, url }) => {
  // Vercel adds the visitor's country; ?country=XX overrides it.
  const country = (
    url.searchParams.get("country") || request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") || "US"
  ).toUpperCase();
  const mediaType = url.searchParams.get("type") === "tv" ? "tv" : "movie";
  if (!/^\d+$/.test(params.id ?? "")) return json({ error: "Bad request" }, 400);
  try {
    const [d, p] = await Promise.all([
      tmdb(`/${mediaType}/${params.id}`, { append_to_response: "credits,videos" }, 1800),
      tmdb(`/${mediaType}/${params.id}/watch/providers`, {}, 1800),
    ]);
    const pr = p.results?.[country];
    const providers = pr
      ? { country, link: pr.link, flatrate: pr.flatrate || [], rent: pr.rent || [], buy: pr.buy || [] }
      : { country, none: true };
    return json({
      ...d, mediaType, providers,
      title: d.title ?? d.name,
      release_date: d.release_date ?? d.first_air_date,
      runtime: d.runtime ?? d.episode_run_time?.[0],
    });
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};
