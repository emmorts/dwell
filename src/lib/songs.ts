import type { Track } from './spotify';

/**
 * Concatenates song lists in order, keeping the first occurrence of each track URI.
 * The same song in two selected playlists is shown once.
 */
export function mergeUnique(lists: Track[][]): Track[] {
	const seen = new Set<string>();
	const out: Track[] = [];
	for (const list of lists) {
		for (const track of list) {
			if (seen.has(track.uri)) continue;
			seen.add(track.uri);
			out.push(track);
		}
	}
	return out;
}

/**
 * Inclusive length bounds in minutes. An empty minimum counts as 0, and an empty maximum
 * means no upper limit.
 */
export function matchesLength(
	track: Track,
	minMinutes: number | null,
	maxMinutes: number | null
): boolean {
	const min = (minMinutes ?? 0) * 60_000;
	const max = maxMinutes === null ? Infinity : maxMinutes * 60_000;
	return track.duration_ms >= min && track.duration_ms <= max;
}

/** Case-insensitive match on the title or any artist. A blank query matches everything. */
export function matchesQuery(track: Track, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return (
		track.name.toLowerCase().includes(q) ||
		track.artists.some((artist) => artist.name.toLowerCase().includes(q))
	);
}
