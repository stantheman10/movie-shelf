import type { APIRoute } from "astro";
import { tmdb, json } from "../../../lib/tmdb";

export const GET: APIRoute = async ({ params, request, url }) => {
  // Vercel adds the visitor's country; ?country=XX overrides it.
  const country = (
    url.searchParams.get("country") || request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") || "US"
  ).toUpperCase();
  try {
    const [d, p] = await Promise.all([
      tmdb(`/movie/${params.id}`, { append_to_response: "credits,videos" }),
      tmdb(`/movie/${params.id}/watch/providers`),
    ]);
    const pr = p.results?.[country];
    const providers = pr
      ? { country, link: pr.link, flatrate: pr.flatrate || [], rent: pr.rent || [], buy: pr.buy || [] }
      : { country, none: true };
    return json({ ...d, providers });
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};
