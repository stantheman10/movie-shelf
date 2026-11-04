# CLAUDE.md

Movie Shelf: browse movies and streaming availability (TMDB); signed-in users keep a Watchlist / Watched library.

Stack: Astro 7 (`output: "server"`), Neon Postgres via Drizzle ORM (`neon-http`), Better Auth (Google sign-in), TMDB v3 API. Deployed to Vercel, or as a standalone Node server in Docker.

> Note: `/Users/stanriccardozo/Downloads/AGENTS.md` describes a different project (a CV RAG assistant on TanStack Start). It does not apply here.

## Commands

```bash
npm install
cp .env.example .env   # fill in every value
npm run db:push        # sync src/db/schema.ts to the Neon database (drizzle-kit push)
npm run dev            # http://localhost:4321
npm run build          # Vercel adapter by default
npm run preview
DEPLOY_TARGET=docker npm run build   # standalone Node build -> dist/server/entry.mjs
```

There is no test runner, linter, or formatter configured. Type-check with `npx astro check` or `npx tsc --noEmit` if needed (neither is a dependency yet).
There are no migration files: schema changes are applied with `db:push`.

## Layout

- `src/pages/index.astro`: the single page shell; the UI is plain JS/CSS served from `public/` (`app.js`, `styles.css`), not an Astro/React component tree.
- `src/pages/api/`: API routes (`search`, `library`, `me`, `movie/[id]`, `auth/[...all]` for Better Auth).
- `src/lib/auth.ts`: Better Auth config and `getUserId(request)`, which returns the user id or null.
- `src/lib/tmdb.ts`: `tmdb(path, params)` fetch helper and the `json(data, status)` response helper.
- `src/lib/env.ts`: `env(key)` reads `import.meta.env` first, then `process.env`. Use it instead of reading either directly.
- `src/db/schema.ts`: Better Auth tables (`user`, `session`, `account`, `verification`) plus the app table `library`.
- `src/db/index.ts`: the Drizzle client.

## Conventions

- API routes export `APIRoute` handlers (`GET`/`POST`/`DELETE`), respond with `json()`, and use short error bodies like `{ error: "Sign in required" }`.
- Any route touching user data must call `getUserId(request)` first and return 401 when null. Scope every `library` query by `userId`.
- `library` has a composite primary key `(userId, movieId)`. Writes use `onConflictDoUpdate`. `status` is `"watchlist"` or `"watched"` (validated in the route, plain text in the DB).
- Validate and clamp request input in the route (e.g. title sliced to 300 chars, year to 4).
- Keep the TMDB API key server-side; the browser only talks to this app's `/api/*` routes.
- Better Auth's table definitions in `schema.ts` must match what Better Auth expects. Don't rename those columns.
- Streaming region comes from the `x-vercel-ip-country` header, then `cf-ipcountry`, defaulting to US. `?country=XX` overrides it.
- Streaming data is from JustWatch via TMDB. Keep the attribution.

## Environment variables

`DATABASE_URL` (Neon pooled string), `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL` (public site URL), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TMDB_API_KEY`. See `.env.example`. Never commit `.env` or print its values.

Sign-in only works on the origin in `BETTER_AUTH_URL`. That URL plus `/api/auth/callback/google` must be registered as a Google redirect URI, so preview deployments won't sign in by default.

## Deployment

- Vercel: the default adapter. Set the same env vars in project settings.
- Docker: `DEPLOY_TARGET=docker` switches to `@astrojs/node` standalone. The Dockerfile builds with it, runs as the `node` user on port 4321, and health-checks `/api/auth/ok`.
