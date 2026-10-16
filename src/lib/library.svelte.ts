import {
	fetchLikedTracks,
	fetchPlaylistTracks,
	LIKED_SONGS,
	type Playlist,
	type Track
} from './spotify';
import {
	buildSources,
	canSelect,
	describeSourceError,
	filterSources,
	type SourceError
} from './sources';
import { mergeUnique } from './songs';

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
	const copy = { ...record };
	delete copy[key];
	return copy;
}

/**
 * The user's music sources (Liked Songs and playlists): which are selected, their songs once
 * loaded, and any loading or error state per source.
 */
export class Library {
	playlists = $state<Playlist[]>([]);
	libraryAccess = $state(false);
	query = $state('');
	selected = $state<string[]>([]);
	cache = $state<Record<string, Track[]>>({});
	inFlight = $state<Record<string, true>>({});
	errors = $state<Record<string, SourceError>>({});

	sources = $derived(buildSources(this.playlists));
	visibleSources = $derived(filterSources(this.sources, this.query));
	selectedCount = $derived(this.selected.length);
	loadingCount = $derived(Object.keys(this.inFlight).length);

	/** Songs from every selected source, de-duplicated, in source order. */
	songs = $derived(
		mergeUnique(
			this.sources
				.filter((source) => this.selected.includes(source.id))
				.map((source) => this.cache[source.id] ?? [])
		)
	);

	sourceName(id: string): string {
		return this.sources.find((source) => source.id === id)?.name ?? id;
	}

	canSelect(id: string): boolean {
		return canSelect(id, this.libraryAccess);
	}

	/** Loads a source's songs once. Failures are kept per source, so the rest of the page keeps working. */
	async load(id: string): Promise<void> {
		if (this.cache[id] || this.inFlight[id]) return;
		this.inFlight = { ...this.inFlight, [id]: true };
		try {
			const tracks =
				id === LIKED_SONGS ? await fetchLikedTracks() : await fetchPlaylistTracks(id);
			this.cache = { ...this.cache, [id]: tracks };
			this.errors = withoutKey(this.errors, id);
		} catch (e) {
			this.errors = { ...this.errors, [id]: describeSourceError(id, e) };
		} finally {
			this.inFlight = withoutKey(this.inFlight, id);
		}
	}

	toggle(id: string): void {
		if (this.selected.includes(id)) {
			this.selected = this.selected.filter((s) => s !== id);
			return;
		}
		if (!this.canSelect(id)) return;
		this.selected = [...this.selected, id];
		void this.load(id);
	}

	/** Selects every visible source that can be selected. */
	selectVisible(): void {
		const ids = this.visibleSources
			.map((source) => source.id)
			.filter((id) => !this.selected.includes(id) && this.canSelect(id));
		this.selected = [...this.selected, ...ids];
		for (const id of ids) void this.load(id);
	}

	clearSelection(): void {
		this.selected = [];
	}
}
