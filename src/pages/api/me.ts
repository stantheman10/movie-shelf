import type { APIRoute } from "astro";
import { auth } from "../../lib/auth";
import { json } from "../../lib/tmdb";

export const GET: APIRoute = async ({ request }) => {
  try {
    const s = await auth.api.getSession({ headers: request.headers });
    return json({ user: s ? { name: s.user.name, image: s.user.image } : null });
  } catch {
    return json({ user: null });
  }
};
