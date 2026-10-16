<script lang="ts">
	// Placeholder with the same geometry as a real row, so loaded content does not shift the layout.
	type Props = { kind: 'source' | 'song' };

	let { kind }: Props = $props();
</script>

{#if kind === 'song'}
	<li class="song-row" aria-hidden="true">
		<span class="skeleton h-4 w-6"></span>
		<span class="skeleton h-10 w-10"></span>
		<span class="min-w-0 space-y-2">
			<span class="skeleton h-4 w-3/4"></span>
			<span class="skeleton h-3 w-1/2"></span>
		</span>
		<span class="skeleton h-6 w-12"></span>
	</li>
{:else}
	<li class="source-row" aria-hidden="true">
		<span class="skeleton h-5 w-5 shrink-0"></span>
		<span class="skeleton h-10 w-10 shrink-0"></span>
		<span class="min-w-0 flex-1 space-y-2">
			<span class="skeleton h-4 w-2/3"></span>
			<span class="skeleton h-3 w-1/4"></span>
		</span>
	</li>
{/if}
