import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { library } from "../../db/schema";
import { getUserId } from "../../lib/auth";
import { json } from "../../lib/tmdb";

export const GET: APIRoute = async ({ request }) => {
  const uid = await getUserId(request);
  if (!uid) return json({ error: "Sign in required" }, 401);
  const rows = await db.select().from(library).where(eq(library.userId, uid));
  return json(rows.map((r) => ({ id: r.movieId, title: r.title, year: r.year, poster: r.poster, overview: r.overview, status: r.status })));
};

export const POST: APIRoute = async ({ request }) => {
  const uid = await getUserId(request);
  if (!uid) return json({ error: "Sign in required" }, 401);
  const { movie, status } = await request.json();
  if (!movie?.id || !movie?.title || !["watchlist", "watched"].includes(status))
    return json({ error: "Bad request" }, 400);
  const values = {
    userId: uid, movieId: Number(movie.id), title: String(movie.title).slice(0, 300),
    year: movie.year ? String(movie.year).slice(0, 4) : null,
    poster: movie.poster ?? null, overview: movie.overview ?? null, status, updatedAt: new Date(),
  };
  await db.insert(library).values(values).onConflictDoUpdate({
    target: [library.userId, library.movieId],
    set: { status, title: values.title, year: values.year, poster: values.poster, overview: values.overview, updatedAt: values.updatedAt },
  });
  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const uid = await getUserId(request);
  if (!uid) return json({ error: "Sign in required" }, 401);
  const id = Number(url.searchParams.get("id"));
  if (!id) return json({ error: "Bad request" }, 400);
  await db.delete(library).where(and(eq(library.userId, uid), eq(library.movieId, id)));
  return json({ ok: true });
};
