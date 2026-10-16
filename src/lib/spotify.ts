const PUBLIC_SPOTIFY_CLIENT_ID: string = import.meta.env.PUBLIC_SPOTIFY_CLIENT_ID ?? '';

const ACCOUNTS = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';
const SCOPES = 'playlist-read-private playlist-read-collaborative';
const TOKEN_KEY = 'spotify_tokens';
const VERIFIER_KEY = 'spotify_pkce_verifier';

export type Track = {
	id: string | null;
	name: string;
	uri: string;
	duration_ms: number;
	type?: string;
	artists: { name: string }[];
};

export type Playlist = {
	id: string;
	name: string;
	collaborative: boolean;
	owner: { id: string };
};

export type PlaylistEntry = { item?: Track | null; track?: Track | null };

type Tokens = { access_token: string; refresh_token: string; expires_at: number };
type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
};
type Page<T> = { items: T[]; next: string | null };

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

function saveTokens(res: TokenResponse, previousRefresh?: string): void {
	const tokens: Tokens = {
		access_token: res.access_token,
		refresh_token: res.refresh_token ?? previousRefresh ?? '',
		// Refresh 60s early so a request never starts with an about-to-expire token.
		expires_at: Date.now() + (res.expires_in - 60) * 1000
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
		saveTokens(res, tokens.refresh_token);
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
	if (res.status === 403) {
		throw new Error(
			'Spotify denied access (403). In development mode the account must be added under ' +
				'"User Management" in the Spotify dashboard.'
		);
	}
	if (!res.ok) throw new Error(`Spotify API error (${res.status}): ${await res.text()}`);
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

/** Returns only playable tracks; podcast episodes and unavailable items are dropped. */
export async function fetchPlaylistTracks(playlistId: string): Promise<Track[]> {
	const entries = await getAll<PlaylistEntry>(
		`${API}/playlists/${encodeURIComponent(playlistId)}/items?limit=50`
	);
	return entries
		.map((e) => e.item ?? e.track)
		.filter((t): t is Track => Boolean(t) && t!.type !== 'episode');
}
