import { describe, expect, test } from 'bun:test';
import type { Track } from './spotify';
import { matchesLength, matchesQuery, mergeUnique } from './songs';

function track(uri: string, name: string, durationMs: number, artists = ['Artist']): Track {
	return {
		id: uri,
		name,
		uri,
		duration_ms: durationMs,
		artists: artists.map((name) => ({ name }))
	};
}

const SEVEN_MIN = 7 * 60_000;

describe('mergeUnique', () => {
	test('keeps the first occurrence of a URI and preserves list order', () => {
		const a = track('spotify:track:a', 'A', 1000);
		const b = track('spotify:track:b', 'B', 1000);
		const aAgain = track('spotify:track:a', 'A (other playlist)', 1000);

		const merged = mergeUnique([[b, a], [aAgain]]);

		expect(merged.map((t) => t.name)).toEqual(['B', 'A']);
	});

	test('returns an empty list when there are no songs', () => {
		expect(mergeUnique([])).toEqual([]);
		expect(mergeUnique([[], []])).toEqual([]);
	});
});

describe('matchesLength', () => {
	test('bounds are inclusive', () => {
		expect(matchesLength(track('u', 'x', SEVEN_MIN), 7, null)).toBe(true);
		expect(matchesLength(track('u', 'x', SEVEN_MIN), null, 7)).toBe(true);
		expect(matchesLength(track('u', 'x', SEVEN_MIN - 1), 7, null)).toBe(false);
		expect(matchesLength(track('u', 'x', SEVEN_MIN + 1), null, 7)).toBe(false);
	});

	test('an empty minimum counts as zero and an empty maximum has no limit', () => {
		expect(matchesLength(track('u', 'x', 0), null, null)).toBe(true);
		expect(matchesLength(track('u', 'x', 10 * 3_600_000), null, null)).toBe(true);
	});
});

describe('matchesQuery', () => {
	const song = track('u', 'Midnight Run', 1000, ['Zed Ocean', 'Mira Vale']);

	test('matches the title, ignoring case', () => {
		expect(matchesQuery(song, 'MIDNIGHT')).toBe(true);
	});

	test('matches any artist', () => {
		expect(matchesQuery(song, 'mira')).toBe(true);
	});

	test('a blank or whitespace-only query matches everything', () => {
		expect(matchesQuery(song, '')).toBe(true);
		expect(matchesQuery(song, '   ')).toBe(true);
	});

	test('does not match unrelated text', () => {
		expect(matchesQuery(song, 'sunrise')).toBe(false);
	});
});
