<script lang="ts">
	import { onMount } from 'svelte';
	import {
		isConfigured,
		isLoggedIn,
		login,
		logout,
		fetchMe,
		fetchEditablePlaylists,
		fetchLikedTracks,
		fetchPlaylistTracks,
		LIKED_SONGS,
		type Playlist,
		type Track
	} from '../lib/spotify';

	type Status = 'loading' | 'logged-out' | 'ready' | 'error';

	let status = $state<Status>('loading');
	let error = $state<string | null>(null);
	let playlists = $state<Playlist[]>([]);
	let selectedId = $state<string>('');
	let tracks = $state<Track[]>([]);
	let loadingTracks = $state(false);

	// Minutes as typed by the user. Empty max means "no upper bound".
	let minMinutes = $state<number | null>(7);
	let maxMinutes = $state<number | null>(null);

	const minMs = $derived((minMinutes ?? 0) * 60_000);
	const maxMs = $derived(maxMinutes === null ? Infinity : maxMinutes * 60_000);
	const filtered = $derived(
		tracks.filter((t) => t.duration_ms >= minMs && t.duration_ms <= maxMs)
	);

	function formatDuration(ms: number): string {
		const totalSeconds = Math.round(ms / 1000);
		const m = Math.floor(totalSeconds / 60);
		const s = String(totalSeconds % 60).padStart(2, '0');
		return `${m}:${s}`;
	}

	function fail(e: unknown) {
		error = e instanceof Error ? e.message : String(e);
		status = 'error';
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
		try {
			const me = await fetchMe();
			playlists = await fetchEditablePlaylists(me.id);
			status = 'ready';
		} catch (e) {
			fail(e);
		}
	}

	async function selectPlaylist(id: string) {
		selectedId = id;
		tracks = [];
		if (!id) return;
		loadingTracks = true;
		try {
			tracks = id === LIKED_SONGS ? await fetchLikedTracks() : await fetchPlaylistTracks(id);
		} catch (e) {
			fail(e);
		} finally {
			loadingTracks = false;
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
				Connect Spotify to see which songs in one of your playlists fall within a set running time.
			</p>
			<button onclick={login} class="btn-primary">Connect Spotify</button>
		</section>
	{:else if status === 'error'}
		<h1 class="heading">Service disruption</h1>
		<p class="notice">{error}</p>
		{#if isConfigured && !isLoggedIn()}
			<button onclick={login} class="btn-quiet">Try connecting again</button>
		{/if}
	{:else}
		<div class="flex items-center justify-between">
			<h1 class="heading">Timetable</h1>
			<button onclick={signOut} class="btn-quiet">Log out</button>
		</div>

		<section class="panel space-y-6">
			<label class="block space-y-2">
				<span class="eyebrow">Line · playlist</span>
				<select
					class="field"
					value={selectedId}
					onchange={(e) => selectPlaylist(e.currentTarget.value)}
				>
					<option value="">Choose a playlist…</option>
					<option value={LIKED_SONGS}>Liked Songs</option>
					{#each playlists as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</label>

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

		{#if loadingTracks}
			<p class="eyebrow">Loading stops…</p>
		{:else if selectedId}
			<section class="space-y-2">
				<div class="flex items-baseline justify-between border-b-2 border-ink pb-2">
					<span class="eyebrow">Stops in service</span>
					<span class="eyebrow tabular-nums">{filtered.length} of {tracks.length}</span>
				</div>
				<ol>
					{#each filtered as t, i (t.uri + i)}
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
							<p class="heading text-2xl">No service</p>
							<p class="text-ink-soft">No songs fall within this running time.</p>
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	{/if}
</main>
