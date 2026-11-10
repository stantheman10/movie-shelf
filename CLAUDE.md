# CLAUDE.md

Movie Hub: browse movies and streaming availability (TMDB); signed-in users keep a Watchlist / Watched library.

Stack: Astro 7 (`output: "server"`), Neon Postgres via Drizzle ORM (`neon-http`), Better Auth (Google sign-in), TMDB v3 API. Deployed to Render as a Docker web service (standalone Node server). Vercel is still supported by the default adapter.

> Note: `/Users/stanriccardozo/Downloads/AGENTS.md` describes a different project (a CV RAG assistant on TanStack Start). It does not apply here.

## Commands

```bash
npm install
cp .env.example .env   # fill in every value
npm run db:push        # sync src/db/schema.ts to the Neon database (drizzle-kit push)
npm run dev            # http://localhost:4321
npm run build          # Vercel adapter by default (not used on Render)
npm run preview
npm test                # vitest (tests/): rate limiter, cache, TMDB helper, search route, client helpers
DEPLOY_TARGET=docker npm run build   # standalone Node build -> dist/server/entry.mjs
```

There is no linter or formatter configured. Type-check with `npx astro check` or `npx tsc --noEmit` if needed (neither is a dependency yet).
There are no migration files: schema changes are applied with `db:push`.

## Layout

- `src/pages/index.astro`: the single page shell; the UI is plain browser ES modules in `public/js/` (loaded as `type="module"` from `main.js`) plus `public/styles.css`, not an Astro/React component tree. Modules: `state` (shared mutable state), `api` (fetch + retry), `views` (HTML + `render()`), `auth`, `library`, `search` (debounced search + pagination), `util`, `main` (events/init).
- `src/pages/api/`: API routes (`search` returns `{ results, page, totalPages }`, `trending` (movies + shows, cached 1h; feeds the home screen), `library`, `me`, `movie/[id]`, `auth/[...all]` for Better Auth).
- `src/lib/auth.ts`: Better Auth config and `getUserId(request)`, which returns the user id or null.
- `src/lib/tmdb.ts`: `tmdb(path, params, ttlSeconds)` fetch helper (retries network errors, caches successes in memory, default 5 min; details use 30 min) and the `json(data, status)` response helper.
- `src/middleware.ts` + `src/lib/api-limit.ts` + `src/lib/rate-limit.ts`: in-memory rate limit on `/api/search`, `/api/trending` and `/api/movie/*` (90 req/min per IP, 900/min global backstop; 429 + `Retry-After`). `src/lib/cache.ts` is the TTL cache. State is per process, so it assumes a single instance; move to a shared store (e.g. Redis) before scaling out.
- Smart search (signed-in only): `src/pages/api/smart-search.ts` -> `src/lib/smart-search.ts` (24h in-memory cache, strict title+year match against TMDB, drops unmatched LLM titles) -> `src/lib/llm.ts` (NVIDIA OpenAI-compatible chat API, 30s timeout, thinking disabled). On any LLM failure the route falls back to `/search/multi` and returns `fallback: true`. It has its own tighter limiter in `src/middleware.ts` (10/min per IP, 30/min global) because the free NVIDIA tier (~40 req/min) is shared. `scripts/eval-smart-search.ts` is a dev-only quality check (`npx tsx --env-file=.env scripts/eval-smart-search.ts`).
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
- Streaming region comes from the `x-vercel-ip-country` header, then `cf-ipcountry`, defaulting to US. On Render neither is sent (unless behind Cloudflare), so it is US unless `?country=XX` is passed.
- Streaming data is from JustWatch via TMDB. Keep the attribution.

## Environment variables

`DATABASE_URL` (Neon pooled string), `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL` (public site URL), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TMDB_API_KEY`, `NVIDIA_API_KEY` (Smart search), optional `NVIDIA_MODEL` (default `nvidia/nemotron-3-ultra-550b-a55b`). See `.env.example`. Never commit `.env` or print its values.

Sign-in only works on the origin in `BETTER_AUTH_URL`. That URL plus `/api/auth/callback/google` must be registered as a Google redirect URI, so preview deployments won't sign in by default.

## Deployment

- **Render (production):** Web Service with the Docker runtime, using the root `Dockerfile` (sets `DEPLOY_TARGET=docker`, builds `@astrojs/node` standalone, runs as the `node` user). Set all env vars in the Render dashboard, set Health Check Path to `/api/auth/ok`, and set `BETTER_AUTH_URL` to the public URL. Render injects `PORT`, which the Node server reads. The Dockerfile's `HEALTHCHECK` is ignored by Render.
- Run `npm run db:push` from a local machine against the Neon database; Render does not run it.
- Vercel: still works via the default adapter (build without `DEPLOY_TARGET`), but is not the target.
