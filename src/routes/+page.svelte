<script lang="ts">
	import { onMount } from 'svelte';
	import {
		fetchEditablePlaylists,
		fetchLikedTracks,
		fetchMe,
		fetchPlaylistTracks,
		hasLibraryAccess,
		isConfigured,
		isLoggedIn,
		LIKED_SONGS,
		login,
		logout,
		SpotifyApiError,
		type Playlist,
		type SpotifyImage,
		type Track
	} from '../lib/spotify';
	import Thumb from '../lib/components/Thumb.svelte';

	type Status = 'loading' | 'logged-out' | 'ready' | 'error';
	type Source = { id: string; name: string; images: SpotifyImage[] | null; icon: 'list' | 'heart' };
	type SourceError = { message: string; reconnect: boolean };

	let status = $state<Status>('loading');
	let error = $state<string | null>(null);
	let playlists = $state<Playlist[]>([]);
	let libraryAccess = $state(false);

	// Playlist picker state. A source is a playlist, or LIKED_SONGS.
	let query = $state('');
	let selected = $state<string[]>([]);
	let cache = $state<Record<string, Track[]>>({});
	let sourceErrors = $state<Record<string, SourceError>>({});
	let pending = $state(0);

	// Minutes as typed by the user. Empty max means "no upper bound".
	let minMinutes = $state<number | null>(7);
	let maxMinutes = $state<number | null>(null);

	const sources = $derived<Source[]>([
		{ id: LIKED_SONGS, name: 'Liked Songs', images: null, icon: 'heart' },
		...playlists.map((p) => ({ id: p.id, name: p.name, images: p.images ?? null, icon: 'list' as const }))
	]);
	const visibleSources = $derived(
		sources.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
	);
	const selectedCount = $derived(selected.length);

	// Songs from every selected source, de-duplicated by URI, in source order.
	const merged = $derived.by(() => {
		const seen = new Set<string>();
		const out: Track[] = [];
		for (const source of sources) {
			if (!selected.includes(source.id)) continue;
			for (const t of cache[source.id] ?? []) {
				if (seen.has(t.uri)) continue;
				seen.add(t.uri);
				out.push(t);
			}
		}
		return out;
	});

	const minMs = $derived((minMinutes ?? 0) * 60_000);
	const maxMs = $derived(maxMinutes === null ? Infinity : maxMinutes * 60_000);
	const filtered = $derived(
		merged.filter((t) => t.duration_ms >= minMs && t.duration_ms <= maxMs)
	);

	function formatDuration(ms: number): string {
		const totalSeconds = Math.round(ms / 1000);
		const m = Math.floor(totalSeconds / 60);
		const s = String(totalSeconds % 60).padStart(2, '0');
		return `${m}:${s}`;
	}

	function nameOf(id: string): string {
		return sources.find((s) => s.id === id)?.name ?? id;
	}

	function canSelect(id: string): boolean {
		return id !== LIKED_SONGS || libraryAccess;
	}

	function describeError(id: string, e: unknown): SourceError {
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

	function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
		const copy = { ...record };
		delete copy[key];
		return copy;
	}

	async function load(id: string) {
		if (cache[id]) return;
		pending += 1;
		try {
			const tracks = id === LIKED_SONGS ? await fetchLikedTracks() : await fetchPlaylistTracks(id);
			cache = { ...cache, [id]: tracks };
			sourceErrors = withoutKey(sourceErrors, id);
		} catch (e) {
			sourceErrors = { ...sourceErrors, [id]: describeError(id, e) };
		} finally {
			pending -= 1;
		}
	}

	function toggle(id: string) {
		if (selected.includes(id)) {
			selected = selected.filter((s) => s !== id);
			return;
		}
		if (!canSelect(id)) return;
		selected = [...selected, id];
		load(id);
	}

	function selectVisible() {
		const ids = visibleSources
			.map((s) => s.id)
			.filter((id) => !selected.includes(id) && canSelect(id));
		selected = [...selected, ...ids];
		for (const id of ids) load(id);
	}

	function clearSelection() {
		selected = [];
	}

	async function init() {
		if (!isConfigured) {
			error = 'PUBLIC_SPOTIFY_CLIENT_ID is not set. Copy .env.example to .env and fill it in.';
			status = 'error';
			return;
		}
		if (!isLoggedIn()) {
			status = 'logged-out';
			return;
		}
		libraryAccess = hasLibraryAccess();
		try {
			const me = await fetchMe();
			playlists = await fetchEditablePlaylists(me.id);
			status = 'ready';
		} catch (e) {
			if (e instanceof SpotifyApiError && e.status === 401) {
				// Stored session is no longer valid: clear it and offer a fresh login.
				logout();
				window.location.reload();
				return;
			}
			error = e instanceof Error ? e.message : String(e);
			status = 'error';
		}
	}

	onMount(init);
</script>

<main class="mx-auto max-w-3xl space-y-8 px-6 py-10">
	{#if status === 'loading'}
		<p class="eyebrow">Loading…</p>
	{:else if status === 'logged-out'}
		<section class="panel space-y-5">
			<h1 class="heading">Filter by length</h1>
			<p class="text-lg text-ink-soft">
				Connect Spotify to see which songs in your playlists or Liked Songs fall within a set
				running time.
			</p>
			<button onclick={login} class="btn-primary">Connect Spotify</button>
		</section>
	{:else if status === 'error'}
		<h1 class="heading">Error</h1>
		<p class="notice">{error}</p>
		{#if isConfigured && !isLoggedIn()}
			<button onclick={login} class="btn-quiet">Connect Spotify</button>
		{/if}
	{:else}
		<h1 class="heading">Filter by length</h1>

		<section class="panel space-y-5">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<span class="eyebrow tabular-nums">Playlists · {selectedCount} selected</span>
				<div class="flex gap-6">
					<button
						class="btn-quiet"
						onclick={selectVisible}
						disabled={visibleSources.length === 0}>Select shown</button
					>
					<button class="btn-quiet" onclick={clearSelection} disabled={selectedCount === 0}
						>Clear</button
					>
				</div>
			</div>

			<input
				type="search"
				class="field"
				placeholder="Search playlists"
				aria-label="Search playlists"
				bind:value={query}
			/>

			<ul class="max-h-80 overflow-y-auto border-2 border-ink">
				{#each visibleSources as s (s.id)}
					{@const checked = selected.includes(s.id)}
					{@const blocked = !canSelect(s.id)}
					<li class="source-row">
						<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
							<input
								type="checkbox"
								class="check"
								{checked}
								disabled={blocked}
								onchange={() => toggle(s.id)}
							/>
							<Thumb images={s.images} size={40} icon={s.icon} />
							<span class="min-w-0 flex-1 truncate" class:font-semibold={checked}>{s.name}</span>
						</label>
						{#if cache[s.id]}
							<span class="eyebrow shrink-0 tabular-nums">{cache[s.id].length} songs</span>
						{/if}
						{#if blocked}
							<button class="btn-quiet shrink-0" onclick={login}>Reconnect</button>
						{/if}
					</li>
				{:else}
					<li class="px-4 py-6 text-center text-ink-soft">No playlists match “{query}”.</li>
				{/each}
			</ul>

			{#if pending > 0}
				<p class="eyebrow tabular-nums">Loading songs…</p>
			{/if}

			{#each Object.entries(sourceErrors) as [id, err] (id)}
				<div class="notice space-y-3">
					<p><span class="font-semibold">{nameOf(id)}:</span> {err.message}</p>
					{#if err.reconnect}
						<button onclick={login} class="btn-quiet">Reconnect Spotify</button>
					{:else}
						<button onclick={() => load(id)} class="btn-quiet">Retry</button>
					{/if}
				</div>
			{/each}
		</section>

		<section class="panel">
			<div class="grid grid-cols-2 gap-4 sm:gap-6">
				<label class="block space-y-2">
					<span class="eyebrow">Shortest</span>
					<span class="field-wrap">
						<input type="number" min="0" step="0.5" class="field" bind:value={minMinutes} />
						<span class="field-suffix" aria-hidden="true">min</span>
					</span>
				</label>
				<label class="block space-y-2">
					<span class="eyebrow">Longest</span>
					<span class="field-wrap">
						<input
							type="number"
							min="0"
							step="0.5"
							placeholder="No limit"
							class="field"
							bind:value={maxMinutes}
						/>
						<span class="field-suffix" aria-hidden="true">min</span>
					</span>
				</label>
			</div>
		</section>

		{#if selectedCount === 0}
			<p class="eyebrow">Select one or more playlists to see songs.</p>
		{:else}
			<section class="space-y-2">
				<div class="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
					<span class="eyebrow">Songs</span>
					<span class="eyebrow tabular-nums">{filtered.length} of {merged.length} match</span>
				</div>
				<ol>
					{#each filtered as t, i (t.uri)}
						<li class="song-row">
							<span class="song-number">{String(i + 1).padStart(2, '0')}</span>
							<Thumb images={t.album?.images} size={40} icon="note" />
							<div class="min-w-0">
								<p class="truncate font-semibold">{t.name}</p>
								<p class="truncate text-sm text-ink-soft">{t.artists.map((a) => a.name).join(', ')}</p>
							</div>
							<span class="song-duration">{formatDuration(t.duration_ms)}</span>
						</li>
					{:else}
						<li class="py-10 text-center">
							{#if pending > 0}
								<p class="eyebrow">Loading songs…</p>
							{:else}
								<p class="heading text-2xl">No matching songs</p>
								<p class="text-ink-soft">No songs fall within this length range.</p>
							{/if}
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	{/if}
</main>
