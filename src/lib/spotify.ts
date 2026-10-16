const PUBLIC_SPOTIFY_CLIENT_ID: string = import.meta.env.PUBLIC_SPOTIFY_CLIENT_ID ?? '';

const ACCOUNTS = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';
const LIBRARY_SCOPE = 'user-library-read';
const SCOPES = `playlist-read-private playlist-read-collaborative ${LIBRARY_SCOPE}`;
const TOKEN_KEY = 'spotify_tokens';
const VERIFIER_KEY = 'spotify_pkce_verifier';

/** Source id for the user's saved tracks ("Liked Songs"). Not a playlist, so it is never a playlist id. */
export const LIKED_SONGS = 'liked';

export type SpotifyImage = { url: string; width: number | null; height: number | null };

export type Track = {
	id: string | null;
	name: string;
	uri: string;
	duration_ms: number;
	type?: string;
	artists: { name: string }[];
	album?: { images: SpotifyImage[] } | null;
};

export type Playlist = {
	id: string;
	name: string;
	collaborative: boolean;
	owner: { id: string };
	/** Cover art, largest first. May be empty. URLs expire within a day, so never persist them. */
	images?: SpotifyImage[] | null;
};

/** Playlist items use `item` (renamed Feb 2026); saved tracks use `track`. Accept either. */
export type PlaylistEntry = { item?: Track | null; track?: Track | null };

type Tokens = { access_token: string; refresh_token: string; expires_at: number; scope?: string };
type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	scope?: string;
};
type Page<T> = { items: T[]; next: string | null };

export class SpotifyApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'SpotifyApiError';
		this.status = status;
	}
}

export const isConfigured = Boolean(PUBLIC_SPOTIFY_CLIENT_ID);

function base64url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function codeChallenge(verifier: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	return base64url(new Uint8Array(digest));
}

/** Starts the OAuth Authorization Code + PKCE flow (no client secret needed). */
export async function login(): Promise<void> {
	const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
	sessionStorage.setItem(VERIFIER_KEY, verifier);
	const params = new URLSearchParams({
		client_id: PUBLIC_SPOTIFY_CLIENT_ID,
		response_type: 'code',
		redirect_uri: `${window.location.origin}/callback`,
		code_challenge_method: 'S256',
		code_challenge: await codeChallenge(verifier),
		scope: SCOPES
	});
	window.location.href = `${ACCOUNTS}/authorize?${params}`;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
	const res = await fetch(`${ACCOUNTS}/api/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ client_id: PUBLIC_SPOTIFY_CLIENT_ID, ...body })
	});
	if (!res.ok) throw new Error(`Spotify token request failed (${res.status}): ${await res.text()}`);
	return res.json();
}

function saveTokens(res: TokenResponse, previous?: Tokens): void {
	const tokens: Tokens = {
		access_token: res.access_token,
		refresh_token: res.refresh_token ?? previous?.refresh_token ?? '',
		// Refresh 60s early so a request never starts with an about-to-expire token.
		expires_at: Date.now() + (res.expires_in - 60) * 1000,
		// Scopes actually granted to this token. Refresh responses may omit them.
		scope: res.scope ?? previous?.scope
	};
	localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

/** Exchanges the ?code from the callback URL for tokens. */
export async function completeLogin(code: string): Promise<void> {
	const verifier = sessionStorage.getItem(VERIFIER_KEY);
	if (!verifier) throw new Error('Login state missing. Start the login again.');
	sessionStorage.removeItem(VERIFIER_KEY);
	const res = await requestToken({
		grant_type: 'authorization_code',
		code,
		redirect_uri: `${window.location.origin}/callback`,
		code_verifier: verifier
	});
	saveTokens(res);
}

export function logout(): void {
	localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
	return localStorage.getItem(TOKEN_KEY) !== null;
}

/**
 * True when the stored token was granted the library scope. Sessions created before
 * the scope was added have no `scope` field, and refresh never adds scopes, so they
 * need a fresh login.
 */
export function hasLibraryAccess(): boolean {
	const raw = localStorage.getItem(TOKEN_KEY);
	if (!raw) return false;
	const tokens: Tokens = JSON.parse(raw);
	return (tokens.scope ?? '').split(' ').includes(LIBRARY_SCOPE);
}

async function accessToken(): Promise<string> {
	const raw = localStorage.getItem(TOKEN_KEY);
	if (!raw) throw new Error('Not logged in.');
	const tokens: Tokens = JSON.parse(raw);
	if (Date.now() < tokens.expires_at) return tokens.access_token;

	try {
		const res = await requestToken({
			grant_type: 'refresh_token',
			refresh_token: tokens.refresh_token
		});
		saveTokens(res, tokens);
		return res.access_token;
	} catch {
		logout();
		throw new Error('Spotify session expired. Log in again.');
	}
}

async function get<T>(url: string): Promise<T> {
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${await accessToken()}` }
	});
	if (!res.ok) {
		throw new SpotifyApiError(res.status, `Spotify API error (${res.status}): ${await res.text()}`);
	}
	return res.json();
}

async function getAll<T>(firstUrl: string): Promise<T[]> {
	const out: T[] = [];
	let url: string | null = firstUrl;
	while (url) {
		const page: Page<T> = await get<Page<T>>(url);
		out.push(...page.items);
		url = page.next;
	}
	return out;
}

export async function fetchMe(): Promise<{ id: string; display_name: string | null }> {
	return get(`${API}/me`);
}

/** Playlists the user can read item-level contents for: owned or collaborative. */
export async function fetchEditablePlaylists(userId: string): Promise<Playlist[]> {
	const all = await getAll<Playlist>(`${API}/me/playlists?limit=50`);
	return all.filter((p) => p.owner.id === userId || p.collaborative);
}

/** Shared by playlist and saved-track reads. Drops podcast episodes and unavailable items. */
async function collectTracks(firstUrl: string): Promise<Track[]> {
	const entries = await getAll<PlaylistEntry>(firstUrl);
	return entries
		.map((e) => e.item ?? e.track)
		.filter((t): t is Track => Boolean(t) && t!.type !== 'episode');
}

export async function fetchPlaylistTracks(playlistId: string): Promise<Track[]> {
	return collectTracks(`${API}/playlists/${encodeURIComponent(playlistId)}/items?limit=50`);
}

/** Saved tracks ("Liked Songs"). Requires the user-library-read scope. */
export async function fetchLikedTracks(): Promise<Track[]> {
	return collectTracks(`${API}/me/tracks?limit=50`);
}
