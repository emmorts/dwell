# Dwell: filter songs by length

Connect a Spotify account, pick one or more playlists (or your Liked Songs), and list only the songs
whose running time falls inside a minimum/maximum range (in minutes). A song that appears in several
selected playlists is shown once.

Cover art comes from Spotify. Playlists and songs without art show an icon.

Design system: transit timetable signage. All tokens and component classes live in
`src/app.css`; use those classes instead of ad hoc colours or fonts.

Stack: SvelteKit (SPA mode, static output), Svelte 5, Tailwind CSS v4, Bun 1.2.15. Auth is OAuth 2.0
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
   bun run mirror setup     # once per clone: enables the pre-commit lockfile guard
   bun run mirror install   # installs through the npm registry from your npm config
   bun run dev
   ```

   Open http://127.0.0.1:5173.

## Packages, the lockfile and the registry

`bun.lock` always records public `https://registry.npmjs.org/` URLs. Cloudflare Workers Builds installs from
those URLs, so they must never change. Bun downloads from the URLs recorded in the lockfile, not from the
registry you configure. On a network that blocks registry.npmjs.org (for example a corporate VPN), use the
wrapper, which installs through the registry from your npm config and restores public URLs afterwards:

- `bun run mirror install` runs any bun command: `bun run mirror add <pkg>`, `remove`, `update`.
- A plain `bun install` on a blocked network fails with `ConnectionClosed`. Use the wrapper instead.
- A plain `bun add` writes mirror URLs into `bun.lock`. `bun run mirror fix` restores public URLs, and the
  pre-commit guard refuses to commit any non-public URL.
- Git and file dependencies are also reported by the guard. They cannot come from a mirror, so review them
  before committing.
- Bun is pinned to 1.2.15 in `mise.toml`. Bun writes `bun.lock` in a version-specific format, so a different
  version reformats it. The wrapper warns when the version differs.
- Bun rewrites `package.json` formatting on `add` and `remove`. Review that diff before committing.

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

## Tests

`bun run test` checks the lockfile rewrite rules, including a round trip on the committed `bun.lock`.
`bun run lock:check` fails if the lockfile has any non-public URL.

## Notes

- Playlists listed are the ones you own or that are collaborative, because Spotify
  only returns song-level contents for those.
- Liked Songs reads your saved tracks and needs the `user-library-read` permission. Sessions created
  before that permission was added show a "Reconnect" button next to Liked Songs. Click it once to grant it.
- Podcast episodes and unavailable tracks are skipped.
- Tokens are kept in `localStorage` and refreshed automatically. "Log out" clears them.
- Length bounds are inclusive: a 7:00 song passes a 7-minute minimum.
