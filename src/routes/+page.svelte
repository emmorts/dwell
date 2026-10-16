<script lang="ts">
	import { onMount } from 'svelte';
	import { Library } from '#lib/library.svelte';
	import LengthFilter from '#lib/components/LengthFilter.svelte';
	import PlaylistPicker from '#lib/components/PlaylistPicker.svelte';
	import SkeletonRow from '#lib/components/SkeletonRow.svelte';
	import SongList from '#lib/components/SongList.svelte';
	import {
		fetchEditablePlaylists,
		fetchMe,
		hasLibraryAccess,
		isConfigured,
		isLoggedIn,
		login,
		logout,
		SpotifyApiError
	} from '#lib/spotify';
	import { matchesLength, matchesQuery } from '#lib/songs';

	type Status = 'loading' | 'logged-out' | 'ready' | 'error';

	// Set before reloading after a 401, so the logged-out view can explain why.
	const EXPIRED_NOTICE_KEY = 'spotify_expired_notice';

	const library = new Library();

	let status = $state<Status>('loading');
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

	// Song filters. An empty maximum means no upper bound.
	let minMinutes = $state<number | null>(7);
	let maxMinutes = $state<number | null>(null);
	let songQuery = $state('');

	const matching = $derived(
		library.songs.filter(
			(track) => matchesLength(track, minMinutes, maxMinutes) && matchesQuery(track, songQuery)
		)
	);

	async function init() {
		if (!isConfigured) {
			error = 'PUBLIC_SPOTIFY_CLIENT_ID is not set. Copy .env.example to .env and fill it in.';
			status = 'error';
			return;
		}
		if (!isLoggedIn()) {
			notice = sessionStorage.getItem(EXPIRED_NOTICE_KEY);
			sessionStorage.removeItem(EXPIRED_NOTICE_KEY);
			status = 'logged-out';
			return;
		}
		library.libraryAccess = hasLibraryAccess();
		try {
			const me = await fetchMe();
			library.playlists = await fetchEditablePlaylists(me.id);
			status = 'ready';
		} catch (e) {
			if (e instanceof SpotifyApiError && e.status === 401) {
				// The stored session was revoked or expired. Clear it, then reload so the
				// layout and this page both start from the logged-out state.
				sessionStorage.setItem(
					EXPIRED_NOTICE_KEY,
					'Your Spotify session has expired. Connect again to continue.'
				);
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
		<h1 class="heading">Filter by length</h1>
		<section class="panel space-y-5" aria-busy="true">
			<p class="sr-only" role="status">Loading playlists</p>
			<span class="skeleton h-4 w-40" aria-hidden="true"></span>
			<span class="skeleton h-10" aria-hidden="true"></span>
			<ul class="max-h-80 overflow-hidden border-2 border-ink" aria-hidden="true">
				{#each [0, 1, 2, 3, 4] as i (i)}
					<SkeletonRow kind="source" />
				{/each}
			</ul>
		</section>
	{:else if status === 'logged-out'}
		<section class="panel space-y-5">
			<h1 class="heading">Filter by length</h1>
			{#if notice}
				<p class="notice">{notice}</p>
			{/if}
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

		<PlaylistPicker {library} />
		<LengthFilter bind:minMinutes bind:maxMinutes />

		{#if library.selectedCount === 0}
			<p class="eyebrow">Select one or more playlists to see songs.</p>
		{:else}
			<SongList songs={matching} total={library.songs.length} loading={library.loadingCount} bind:query={songQuery} />
		{/if}
	{/if}
</main>
