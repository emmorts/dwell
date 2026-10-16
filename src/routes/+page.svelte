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
		type Track
	} from '../lib/spotify';

	type Status = 'loading' | 'logged-out' | 'ready' | 'error';
	type Source = { id: string; name: string };
	type SourceError = { message: string; reconnect: boolean };

	let status = $state<Status>('loading');
	let error = $state<string | null>(null);
	let playlists = $state<Playlist[]>([]);
	let libraryAccess = $state(false);

	// Line picker state. A "line" is a playlist, or LIKED_SONGS.
	let query = $state('');
	let selected = $state<string[]>([]);
	let cache = $state<Record<string, Track[]>>({});
	let sourceErrors = $state<Record<string, SourceError>>({});
	let pending = $state(0);

	// Minutes as typed by the user. Empty max means "no upper bound".
	let minMinutes = $state<number | null>(7);
	let maxMinutes = $state<number | null>(null);

	const sources = $derived<Source[]>([
		{ id: LIKED_SONGS, name: 'Liked Songs' },
		...playlists.map((p) => ({ id: p.id, name: p.name }))
	]);
	const visibleSources = $derived(
		sources.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
	);
	const selectedCount = $derived(selected.length);

	// Songs from every selected line, de-duplicated by URI, in line order.
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
					message:
						'Spotify has not granted access to your library. Reconnect to grant it.',
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
			error = e instanceof Error ? e.message : String(e);
			status = 'error';
		}
	}

	function signOut() {
		logout();
		window.location.href = '/';
	}

	onMount(init);
</script>

<main class="mx-auto max-w-3xl space-y-8 px-6 py-10">
	{#if status === 'loading'}
		<p class="eyebrow">Loading timetable…</p>
	{:else if status === 'logged-out'}
		<section class="panel space-y-5">
			<h1 class="heading">Plan by song length</h1>
			<p class="text-lg text-ink-soft">
				Connect Spotify to see which songs in your playlists or Liked Songs fall within a set
				running time.
			</p>
			<button onclick={login} class="btn-primary">Connect Spotify</button>
		</section>
	{:else if status === 'error'}
		<h1 class="heading">Service disruption</h1>
		<p class="notice">{error}</p>
		{#if isConfigured}
			{#if isLoggedIn()}
				<button onclick={signOut} class="btn-quiet">Log out</button>
			{:else}
				<button onclick={login} class="btn-quiet">Connect Spotify</button>
			{/if}
		{/if}
	{:else}
		<div class="flex items-center justify-between">
			<h1 class="heading">Timetable</h1>
			<button onclick={signOut} class="btn-quiet">Log out</button>
		</div>

		<section class="panel space-y-5">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<span class="eyebrow tabular-nums">Lines · {selectedCount} selected</span>
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
				placeholder="Search lines"
				aria-label="Search lines"
				bind:value={query}
			/>

			<ul class="max-h-80 overflow-y-auto border-2 border-ink">
				{#each visibleSources as s (s.id)}
					{@const checked = selected.includes(s.id)}
					{@const blocked = !canSelect(s.id)}
					<li class="source-row">
						<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
							<input
								type="checkbox"
								class="check"
								{checked}
								disabled={blocked}
								onchange={() => toggle(s.id)}
							/>
							<span class="min-w-0 flex-1 truncate" class:font-semibold={checked}>{s.name}</span>
						</label>
						{#if cache[s.id]}
							<span class="eyebrow tabular-nums">{cache[s.id].length} songs</span>
						{/if}
						{#if blocked}
							<button class="btn-quiet" onclick={login}>Reconnect</button>
						{/if}
					</li>
				{:else}
					<li class="px-4 py-6 text-center text-ink-soft">No lines match “{query}”.</li>
				{/each}
			</ul>

			{#if pending > 0}
				<p class="eyebrow tabular-nums">Loading {pending} {pending === 1 ? 'line' : 'lines'}…</p>
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

		<section class="panel space-y-6">
			<div class="grid grid-cols-2 gap-6">
				<label class="block space-y-2">
					<span class="eyebrow">Minimum (minutes)</span>
					<input type="number" min="0" step="0.5" class="field" bind:value={minMinutes} />
				</label>
				<label class="block space-y-2">
					<span class="eyebrow">Maximum (minutes)</span>
					<input
						type="number"
						min="0"
						step="0.5"
						placeholder="No limit"
						class="field"
						bind:value={maxMinutes}
					/>
				</label>
			</div>
		</section>

		{#if selectedCount === 0}
			<p class="eyebrow">Select one or more lines to see stops.</p>
		{:else}
			<section class="space-y-2">
				<div class="flex items-baseline justify-between border-b-2 border-ink pb-2">
					<span class="eyebrow">Stops in service</span>
					<span class="eyebrow tabular-nums">{filtered.length} of {merged.length}</span>
				</div>
				<ol>
					{#each filtered as t, i (t.uri)}
						<li class="stop-row">
							<span class="stop-number">{String(i + 1).padStart(2, '0')}</span>
							<div class="min-w-0">
								<p class="truncate text-lg font-semibold">{t.name}</p>
								<p class="truncate text-ink-soft">{t.artists.map((a) => a.name).join(', ')}</p>
							</div>
							<span class="stop-duration">{formatDuration(t.duration_ms)}</span>
						</li>
					{:else}
						<li class="py-10 text-center">
							{#if pending > 0}
								<p class="eyebrow">Loading stops…</p>
							{:else}
								<p class="heading text-2xl">No service</p>
								<p class="text-ink-soft">No songs fall within this running time.</p>
							{/if}
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	{/if}
</main>
