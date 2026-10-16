<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { isLoggedIn, logout } from '../lib/spotify';

	let { children } = $props();

	let loggedIn = $state(false);

	onMount(() => {
		loggedIn = isLoggedIn();
	});

	function signOut() {
		logout();
		window.location.href = '/';
	}
</script>

<div class="min-h-screen bg-paper font-sans text-ink">
	<header class="border-b-2 border-ink">
		<div class="route-stripe" aria-hidden="true"></div>
		<div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
			<a href="/" class="font-display text-4xl leading-none font-bold tracking-tight uppercase">
				Dwell
			</a>
			{#if loggedIn}
				<button onclick={signOut} class="btn-quiet">Log out</button>
			{/if}
		</div>
	</header>

	{@render children()}
</div>
