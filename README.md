# Movie Shelf

Astro (server mode) + Vercel + Neon Postgres + Better Auth (Google sign-in) + TMDB.
Browsing and streaming info need no login. Watchlist / Watched require Google sign-in.

## 1. Get the keys
1. **TMDB**: themoviedb.org/settings/api -> copy the v3 API key.
2. **Neon**: create a project at neon.tech -> Connect -> copy the connection string.
3. **Google OAuth**: console.cloud.google.com -> APIs & Services -> Credentials ->
   Create OAuth client ID (Web application). Add Authorized redirect URIs:
   - `http://localhost:4321/api/auth/callback/google`
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
   (You may need to configure the OAuth consent screen first.)

## 2. Run locally
```bash
npm install
cp .env.example .env    # fill in every value
npm run db:push         # creates the tables in Neon
npm run dev             # http://localhost:4321
```

## 3. Deploy to Vercel
1. Push this folder to a GitHub repo and import it in Vercel (Astro is auto-detected).
2. Add the same env vars in Project Settings -> Environment Variables.
   Set `BETTER_AUTH_URL` to your production URL (e.g. https://YOUR-APP.vercel.app).
3. Deploy. Run `npm run db:push` once locally against the same Neon database
   (already done if you used the same DATABASE_URL).

## Notes
- Streaming region comes from Vercel's `x-vercel-ip-country` header (defaults to US locally).
  Test another region with `/api/movie/603?country=GB`.
- Sign-in only works on the URL set in `BETTER_AUTH_URL`, so preview-deployment URLs will not
  sign in unless you add them as Google redirect URIs and trusted origins.
- Streaming data is provided by JustWatch via TMDB; keep the attribution.

## Docker
```bash
cp .env.example .env     # fill in values; set BETTER_AUTH_URL to the public URL you will use
npm run db:push          # run once (from your machine) to create the tables in Neon
docker build -t movie-shelf .
docker run --env-file .env -p 4321:4321 movie-shelf
# or: docker compose up --build
```
- Add `<BETTER_AUTH_URL>/api/auth/callback/google` as a Google redirect URI.
- Outside Vercel there is no `x-vercel-ip-country` header; the app also reads Cloudflare's `cf-ipcountry`
  and otherwise defaults to US (override with `?country=XX`).
