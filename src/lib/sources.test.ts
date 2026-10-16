import { describe, expect, test } from 'bun:test';
import { LIKED_SONGS, SpotifyApiError } from './spotify';
import {
	buildSources,
	canSelect,
	describeSourceError,
	filterSources,
	type Source
} from './sources';

const playlists = [
	{ id: 'pl1', name: 'Workout', collaborative: false, owner: { id: 'me' }, images: null },
	{ id: 'pl2', name: 'Chill', collaborative: false, owner: { id: 'me' } }
];

describe('buildSources', () => {
	test('puts Liked Songs first, then playlists in order', () => {
		const sources = buildSources(playlists);

		expect(sources.map((s) => s.id)).toEqual([LIKED_SONGS, 'pl1', 'pl2']);
		expect(sources[0].icon).toBe('heart');
	});

	test('playlists without images get null, not undefined', () => {
		const sources = buildSources(playlists);

		expect(sources[1].images).toBeNull();
		expect(sources[2].images).toBeNull();
	});
});

describe('canSelect', () => {
	test('Liked Songs needs the library scope', () => {
		expect(canSelect(LIKED_SONGS, false)).toBe(false);
		expect(canSelect(LIKED_SONGS, true)).toBe(true);
	});

	test('playlists can always be selected', () => {
		expect(canSelect('pl1', false)).toBe(true);
	});
});

describe('filterSources', () => {
	const sources: Source[] = buildSources(playlists);

	test('matches names case-insensitively', () => {
		expect(filterSources(sources, 'WORK').map((s) => s.id)).toEqual(['pl1']);
	});

	test('a blank query returns every source', () => {
		expect(filterSources(sources, '  ')).toHaveLength(sources.length);
	});
});

describe('describeSourceError', () => {
	test('a 403 on Liked Songs asks the user to reconnect', () => {
		const error = describeSourceError(LIKED_SONGS, new SpotifyApiError(403, 'denied'));

		expect(error.reconnect).toBe(true);
		expect(error.message).toContain('Reconnect');
	});

	test('a 403 on a playlist explains the development-mode allowlist', () => {
		const error = describeSourceError('pl1', new SpotifyApiError(403, 'denied'));

		expect(error.reconnect).toBe(false);
		expect(error.message).toContain('allowlisted');
	});

	test('other errors keep their message and do not offer a reconnect', () => {
		const error = describeSourceError('pl1', new Error('Spotify API error (429): slow down'));

		expect(error).toEqual({ message: 'Spotify API error (429): slow down', reconnect: false });
	});
});
