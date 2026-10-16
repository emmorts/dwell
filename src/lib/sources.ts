import { LIKED_SONGS, SpotifyApiError, type Playlist, type SpotifyImage } from './spotify';

/** A line in the picker: Liked Songs, or one of the user's playlists. */
export type Source = {
	id: string;
	name: string;
	images: SpotifyImage[] | null;
	icon: 'list' | 'heart';
};

/** Why a source failed to load, and whether the fix is to reconnect Spotify. */
export type SourceError = { message: string; reconnect: boolean };

export function buildSources(playlists: Playlist[]): Source[] {
	return [
		{ id: LIKED_SONGS, name: 'Liked Songs', images: null, icon: 'heart' },
		...playlists.map((p) => ({
			id: p.id,
			name: p.name,
			images: p.images ?? null,
			icon: 'list' as const
		}))
	];
}

/** Liked Songs needs the library scope, which older sessions were not granted. */
export function canSelect(id: string, libraryAccess: boolean): boolean {
	return id !== LIKED_SONGS || libraryAccess;
}

/** Case-insensitive name filter for the picker. */
export function filterSources(sources: Source[], query: string): Source[] {
	const q = query.trim().toLowerCase();
	return sources.filter((source) => source.name.toLowerCase().includes(q));
}

export function describeSourceError(id: string, e: unknown): SourceError {
	if (e instanceof SpotifyApiError && e.status === 403) {
		if (id === LIKED_SONGS) {
			return {
				message: 'Spotify has not granted access to your library. Reconnect to grant it.',
				reconnect: true
			};
		}
		return {
			message:
				'Spotify denied access to this playlist. In development mode the account must be ' +
				'allowlisted under "User Management" in the Spotify dashboard.',
			reconnect: false
		};
	}
	return { message: e instanceof Error ? e.message : String(e), reconnect: false };
}
