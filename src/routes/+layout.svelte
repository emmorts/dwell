<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-paper font-sans text-ink">
	<header class="border-b-2 border-ink">
		<div class="route-stripe" aria-hidden="true"></div>
		<div class="mx-auto flex max-w-3xl items-end justify-between px-6 pt-5 pb-4">
			<a href="/" class="font-display text-4xl leading-none font-bold tracking-tight uppercase">
				Dwell
			</a>
			<p class="eyebrow">Song length timetable</p>
		</div>
	</header>

	{@render children()}
</div>
