<script lang="ts">
	import { formatDuration } from '../format';
	import type { Track } from '../spotify';
	import SkeletonRow from './SkeletonRow.svelte';
	import Thumb from './Thumb.svelte';

	let {
		songs,
		total,
		loading,
		query = $bindable('')
	}: {
		/** Songs after the length and search filters. */
		songs: Track[];
		/** Songs from the selected sources, before filtering. */
		total: number;
		/** Number of sources still loading. */
		loading: number;
		query: string;
	} = $props();
</script>

<section class="space-y-4">
	<div class="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
		<span class="eyebrow">Songs</span>
		<span class="eyebrow tabular-nums">{songs.length} of {total} match</span>
	</div>

	<input
		type="search"
		class="field"
		placeholder="Search songs or artists"
		aria-label="Search songs or artists"
		bind:value={query}
	/>

	{#if loading > 0}
		<p class="sr-only" role="status">Loading songs</p>
	{/if}

	<ol aria-busy={loading > 0}>
		{#each songs as track, i (track.uri)}
			<li class="song-row">
				<span class="song-number">{String(i + 1).padStart(2, '0')}</span>
				<Thumb images={track.album?.images} size={40} icon="note" />
				<div class="min-w-0">
					<p class="line-clamp-2 break-words font-semibold" title={track.name}>{track.name}</p>
					<p class="truncate text-sm text-ink-soft">
						{track.artists.map((artist) => artist.name).join(', ')}
					</p>
				</div>
				<span class="song-duration">{formatDuration(track.duration_ms)}</span>
			</li>
		{/each}

		{#if loading > 0}
			{#each [0, 1, 2] as i (i)}
				<SkeletonRow kind="song" />
			{/each}
		{:else if songs.length === 0}
			<li class="py-10 text-center">
				<p class="heading text-2xl">No matching songs</p>
				{#if query.trim()}
					<p class="text-ink-soft">Nothing matches “{query.trim()}” in this length range.</p>
				{:else}
					<p class="text-ink-soft">No songs fall within this length range.</p>
				{/if}
			</li>
		{/if}
	</ol>
</section>
