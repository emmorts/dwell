# Dwell: song length timetable

Connect a Spotify account, pick one or more "lines" (playlists, or your Liked Songs), and list only the
songs whose running time falls inside a minimum/maximum range (in minutes). Songs that appear in several
selected lines are shown once.

Cover art comes from Spotify. Lines and songs without art show an icon.

Design system: transit timetable signage. All tokens and component classes live in
`src/app.css`; use those classes instead of ad hoc colours or fonts.

Stack: SvelteKit (SPA mode, static output), Svelte 5, Tailwind CSS v4, Bun. Auth is OAuth 2.0
Authorization Code with PKCE, so no client secret is needed.

## Setup

1. Create an app at https://developer.spotify.com/dashboard.
2. Add this Redirect URI exactly: `http://127.0.0.1:5173/callback`
   (Spotify rejects `localhost`.)
3. In the app's "User Management" section, add the Spotify account you will log in with.
   Development-mode apps only work for allowlisted users.
4. Copy the Client ID into `.env`:

   ```sh
   cp .env.example .env
   # then set PUBLIC_SPOTIFY_CLIENT_ID
   ```

5. Install and run:

   ```sh
   bun install
   bun run dev
   ```

   Open http://127.0.0.1:5173.

**Registry:** this repo always installs from the public npm registry (`https://registry.npmjs.org/`),
set in both `.npmrc` and `bunfig.toml`. `bun.lock` must never record a private mirror, because Cloudflare
cannot reach one. A fresh install therefore needs access to `registry.npmjs.org`.

## Deploy (Cloudflare Workers)

The app builds to static files in `build/`. `wrangler.jsonc` serves them as an
assets-only Worker and sends unmatched paths such as `/callback` to `index.html`.

1. Create the Worker from the repository in the Cloudflare dashboard
   (Workers & Pages → Create → Import a repository). Use:
   - Build command: `bun run build`
   - Deploy command: `npx wrangler deploy`
2. Add the build variable `PUBLIC_SPOTIFY_CLIENT_ID`. Vite inlines it at build time,
   and `.env` is not in the repository, so it must be set here.
3. Register the production redirect URI in the Spotify dashboard:
   `https://<your-worker>.workers.dev/callback` (or your custom domain).

Local preview of the production build: `bun run build && bunx wrangler dev`.

## Notes

- Playlists listed are the ones you own or that are collaborative, because Spotify
  only returns item-level contents for those.
- Liked Songs reads your saved tracks and needs the `user-library-read` permission. Sessions created
  before that permission was added show a "Reconnect" button on that line. Click it once to grant it.
- Podcast episodes and unavailable tracks are skipped.
- Tokens are kept in `localStorage` and refreshed automatically. "Log out" clears them.
- Length bounds are inclusive: a 7:00 song passes a 7-minute minimum.
