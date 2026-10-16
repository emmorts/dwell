<script lang="ts">
	import { login } from '#lib/spotify';
	import type { Library } from '#lib/library.svelte';
	import Thumb from './Thumb.svelte';

	let { library }: { library: Library } = $props();
</script>

<section class="panel space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<span class="eyebrow tabular-nums">Playlists · {library.selectedCount} selected</span>
		<div class="flex gap-6">
			<button
				class="btn-quiet"
				onclick={() => library.selectVisible()}
				disabled={library.visibleSources.length === 0}>Select shown</button
			>
			<button
				class="btn-quiet"
				onclick={() => library.clearSelection()}
				disabled={library.selectedCount === 0}>Clear</button
			>
		</div>
	</div>

	<input
		type="search"
		class="field"
		placeholder="Search playlists"
		aria-label="Search playlists"
		bind:value={library.query}
	/>

	<ul class="max-h-80 overflow-y-auto border-2 border-ink">
		{#each library.visibleSources as source (source.id)}
			{@const checked = library.selected.includes(source.id)}
			{@const blocked = !library.canSelect(source.id)}
			{@const songCount = library.cache[source.id]?.length}
			<li class="source-row">
				<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
					<input
						type="checkbox"
						class="check"
						{checked}
						disabled={blocked}
						onchange={() => library.toggle(source.id)}
					/>
					<Thumb images={source.images} size={40} icon={source.icon} />
					<span class="min-w-0 flex-1">
						<span
							class="line-clamp-2 break-words"
							title={source.name}
							class:font-semibold={checked}>{source.name}</span
						>
						{#if library.inFlight[source.id]}
							<span class="skeleton mt-1 h-3 w-20" aria-hidden="true"></span>
						{:else if songCount !== undefined}
							<span class="block text-sm text-ink-soft tabular-nums"
								>{songCount} {songCount === 1 ? 'song' : 'songs'}</span
							>
						{/if}
					</span>
				</label>
				{#if blocked}
					<button class="btn-quiet shrink-0" onclick={login}>Reconnect</button>
				{/if}
			</li>
		{:else}
			<li class="px-4 py-6 text-center text-ink-soft">No playlists match “{library.query}”.</li>
		{/each}
	</ul>

	{#each Object.entries(library.errors) as [id, err] (id)}
		<div class="notice space-y-3">
			<p><span class="font-semibold">{library.sourceName(id)}:</span> {err.message}</p>
			{#if err.reconnect}
				<button onclick={login} class="btn-quiet">Reconnect Spotify</button>
			{:else}
				<button onclick={() => library.load(id)} class="btn-quiet">Retry</button>
			{/if}
		</div>
	{/each}
</section>
