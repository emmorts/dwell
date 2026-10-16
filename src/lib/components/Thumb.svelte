<script lang="ts">
	import type { SpotifyImage } from '#lib/spotify';

	type Props = {
		images?: SpotifyImage[] | null;
		size: number;
		icon: 'note' | 'list' | 'heart';
	};

	let { images, size, icon }: Props = $props();

	// Smallest image at least twice the display size (for high-density screens),
	// otherwise the largest one available. Null when Spotify returned no art.
	const src = $derived.by(() => {
		if (!images || images.length === 0) return null;
		const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
		const match = sorted.find((i) => (i.width ?? 0) >= size * 2) ?? sorted[sorted.length - 1];
		return match.url;
	});
</script>

<span class="thumb" style:width="{size}px" style:height="{size}px">
	{#if src}
		<img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" />
	{:else}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{#if icon === 'heart'}
				<path
					d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"
				/>
			{:else if icon === 'list'}
				<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
			{:else}
				<path d="M9 18V5l12-2v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="18" cy="16" r="3" />
			{/if}
		</svg>
	{/if}
</span>
