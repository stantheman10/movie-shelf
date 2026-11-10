# Movie Hub

Astro (server mode) + Render (Docker) + Neon Postgres + Better Auth (Google sign-in) + TMDB.
Browsing and streaming info need no login. Watchlist / Watched require Google sign-in.

## 1. Get the keys
1. **TMDB**: themoviedb.org/settings/api -> copy the v3 API key.
2. **Neon**: create a project at neon.tech -> Connect -> copy the connection string.
3. **Google OAuth**: console.cloud.google.com -> APIs & Services -> Credentials ->
   Create OAuth client ID (Web application). Add Authorized redirect URIs:
   - `http://localhost:4321/api/auth/callback/google`
   - `https://YOUR-APP.onrender.com/api/auth/callback/google`
   (You may need to configure the OAuth consent screen first.)

## 2. Run locally
```bash
npm install
cp .env.example .env    # fill in every value
npm run db:push         # creates the tables in Neon
npm run dev             # http://localhost:4321
```

## 3. Deploy to Render
Render builds the included `Dockerfile` (it sets `DEPLOY_TARGET=docker`, producing a standalone Node server).
1. Push this folder to GitHub/GitLab.
2. In Render: **New > Web Service**, connect the repo, and set **Language/Runtime** to **Docker**
   (the Dockerfile at the repo root is used automatically).
3. Under **Environment**, add every variable from `.env.example`.
   Set `BETTER_AUTH_URL` to your public URL (e.g. `https://YOUR-APP.onrender.com`, or your custom domain).
4. Under **Settings > Health Check Path**, set `/api/auth/ok`.
5. Deploy. Run `npm run db:push` once locally against the same Neon database
   (already done if you used the same `DATABASE_URL`).

Render injects its own `PORT` (default 10000); the Node server reads it, so no port config is needed.
The free plan spins the service down when idle, so the first request after a pause is slow.

## Tests
```bash
npm test
```

## Notes
- `/api/search` and `/api/movie/*` are rate limited per IP (in memory, single instance) and TMDB responses are cached briefly in memory.
- Streaming region defaults to US. Test another region with `/api/movie/603?country=GB`.
  Render sends no country header; one is only read if you put Cloudflare (`cf-ipcountry`) in front.
- Sign-in only works on the URL set in `BETTER_AUTH_URL`, so Render preview environments will not
  sign in unless you add their URLs as Google redirect URIs and trusted origins.
- Streaming data is provided by JustWatch via TMDB; keep the attribution.

## Docker (local or any container host)
```bash
cp .env.example .env     # fill in values; set BETTER_AUTH_URL to the public URL you will use
npm run db:push          # run once (from your machine) to create the tables in Neon
docker build -t movie-shelf .
docker run --env-file .env -p 4321:4321 movie-shelf
# or: docker compose up --build
```
- Add `<BETTER_AUTH_URL>/api/auth/callback/google` as a Google redirect URI.
- Vercel is also supported: a normal build (without `DEPLOY_TARGET=docker`) uses `@astrojs/vercel`.
