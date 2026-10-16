<script lang="ts">
	import { onMount } from 'svelte';
	import { completeLogin } from '../../lib/spotify';

	let error = $state<string | null>(null);

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const spotifyError = params.get('error');
		const code = params.get('code');

		if (spotifyError) {
			error = `Spotify login was cancelled or failed: ${spotifyError}`;
			return;
		}
		if (!code) {
			error = 'No authorization code in the callback URL.';
			return;
		}
		try {
			await completeLogin(code);
			window.location.replace('/');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});
</script>

<main class="mx-auto max-w-3xl space-y-6 px-6 py-10">
	{#if error}
		<h1 class="heading">Login failed</h1>
		<p class="notice">{error}</p>
		<a href="/" class="btn-quiet">Back to start</a>
	{:else}
		<p class="eyebrow">Connecting to Spotify…</p>
	{/if}
</main>
