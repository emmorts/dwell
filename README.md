# Dwell

**Filter your Spotify playlists by song length.** Pick a playlist, set a minimum and a maximum running time,
and see only the songs that fit. Useful for finding the tracks that suit a 20-minute run, a commute, or a
set with a strict time slot.

**Try it:** [dwell.auxarena.com](https://dwell.auxarena.com)

## Features

- Filter by minimum and maximum length, in minutes.
- Choose several playlists at once, or Liked Songs. A song in more than one selected source is shown once.
- Search playlists, and search the filtered songs by title or artist.
- Cover art from Spotify, with placeholders where none exists.
- Works on phones and desktops.

## Privacy

Dwell has no server and no database. Spotify sign-in uses OAuth with PKCE, so the app never sees a client
secret. Your Spotify tokens are stored only in your browser's local storage. Click **Log out** to remove them.

Dwell is not affiliated with or endorsed by Spotify.

## Using the hosted app

1. Open [dwell.auxarena.com](https://dwell.auxarena.com) and choose **Connect Spotify**.
2. Pick one or more playlists, or Liked Songs.
3. Set the shortest and longest length you want.

Spotify's development mode only lets approved accounts sign in. If you see "Spotify denied access", ask the
maintainer to add your Spotify account, or [self-host](#self-hosting) with your own Spotify app.

## Development

### Requirements

- [Bun](https://bun.sh) 1.2.15. The version is pinned in `mise.toml`, so [mise](https://mise.jdx.dev) users get it automatically.
- A Spotify developer app (see [Spotify setup](#spotify-setup)).

### Getting started

```sh
git clone https://github.com/emmorts/dwell.git
cd dwell
bun install                     # on a network that blocks npmjs, use: bun run mirror install
cp .env.example .env        # then set PUBLIC_SPOTIFY_CLIENT_ID
bun run dev
```

Open <http://127.0.0.1:5173>. Use `127.0.0.1`, not `localhost`, because Spotify requires a loopback IP for
local redirect URIs.

### Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Build static files into `build/` |
| `bun run preview` | Serve the production build locally |
| `bun run check` | Type-check the Svelte and TypeScript code |
| `bun run test` | Run the tests |
| `bun run lock:check` | Fail if `bun.lock` contains any non-public URL |
| `bun run mirror <command>` | Run any Bun command through your configured npm registry (see below) |

### Project layout

```
src/
  lib/spotify.ts          Spotify sign-in (PKCE), token refresh, and API calls
  lib/components/         Thumb (cover art) and SkeletonRow (loading placeholder)
  routes/+page.svelte     The filter interface
  routes/callback/        OAuth redirect handler
  app.css                 Design tokens and component classes
scripts/                  Lockfile tooling and its tests
wrangler.jsonc            Cloudflare Workers configuration
```

Styling follows the design system in `src/app.css`. Add new UI with its tokens and component classes rather
than ad hoc colours or fonts.

### Dependencies and the lockfile

`bun.lock` always records public `https://registry.npmjs.org/` URLs. The production build installs from those
URLs, so please keep them public.

Bun downloads from the URLs recorded in the lockfile, not from the registry you configure. If your network
blocks registry.npmjs.org, route installs through your own npm registry with the wrapper:

```sh
bun run mirror install          # any Bun command: install, add <pkg>, remove <pkg>, update
bun run mirror fix              # restore public URLs after a plain `bun add` wrote mirror URLs
bun run mirror setup            # once per clone: enable the pre-commit guard
```

The guard refuses to commit a lockfile with non-public URLs, including git or file dependencies.

### Before opening a pull request

Run `bun run check`, `bun run test` and `bun run lock:check`. Then check the change at a 375px-wide viewport
as well as on desktop.

## Self-hosting

Dwell builds to static files, so any static host can serve it. The repository includes a Cloudflare Workers
configuration, described below.

### Spotify setup

1. Create an app at the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
2. Add a redirect URI that exactly matches your site's origin, followed by `/callback`:
   - Local development: `http://127.0.0.1:5173/callback`
   - Production: `https://your-domain.example/callback`
3. Add the Spotify accounts that should be able to sign in. Development-mode apps only allow those accounts.
   Check Spotify's current development-mode limits before inviting many users.
4. Copy the **Client ID**. It is public by design, since PKCE needs no client secret.

### Deploying to Cloudflare Workers

`wrangler.jsonc` serves the built files as an assets-only Worker. Unknown paths such as `/callback` fall back
to `index.html`, which the single-page app needs.

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and select your fork.
2. Set the build command to `bun run build` and the deploy command to `npx wrangler deploy`.
3. Add the build variable `PUBLIC_SPOTIFY_CLIENT_ID`. Vite inlines it into the JavaScript at build time, so
   changing it requires a new build.
4. Register `https://<your-worker>.workers.dev/callback` (or your custom domain) as a redirect URI in your
   Spotify app.

To preview the production build locally: `bun run build && bunx wrangler dev`.

### Other static hosts

Serve the contents of `build/`, and configure the host to return `index.html` for paths that do not match a
file. Set `PUBLIC_SPOTIFY_CLIENT_ID` at build time and register the matching `/callback` redirect URI.

## Contributing

Contributions are welcome. For larger changes, please open an issue first to discuss the approach. Everyone
who has contributed is listed in [CONTRIBUTORS.md](CONTRIBUTORS.md).
