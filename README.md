# Dwell: song length timetable

Connect a Spotify account, pick one of your playlists ("line"), and list only the songs
whose running time falls inside a minimum/maximum range (in minutes).

Design system: transit timetable signage. All tokens and component classes live in
`src/app.css`; use those classes instead of ad hoc colours or fonts.

Stack: SvelteKit (SPA mode), Svelte 5, Tailwind CSS v4, Bun. Auth is OAuth 2.0
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

## Notes

- Only playlists you own or that are collaborative are listed, because Spotify
  only returns item-level contents for those.
- Podcast episodes and unavailable tracks are skipped.
- Tokens are kept in `localStorage` and refreshed automatically. "Log out" clears them.
- Length bounds are inclusive: a 7:00 song passes a 7-minute minimum.
