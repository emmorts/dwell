<script lang="ts">
	let {
		minMinutes = $bindable(7),
		maxMinutes = $bindable(null)
	}: { minMinutes: number | null; maxMinutes: number | null } = $props();
</script>

<section class="panel">
	<div class="grid grid-cols-2 gap-4 sm:gap-6">
		<label class="block space-y-2">
			<span class="eyebrow">Shortest</span>
			<span class="field-wrap">
				<input type="number" min="0" step="0.5" class="field" bind:value={minMinutes} />
				<span class="field-suffix" aria-hidden="true">min</span>
			</span>
		</label>
		<label class="block space-y-2">
			<span class="eyebrow">Longest</span>
			<span class="field-wrap">
				<input
					type="number"
					min="0"
					step="0.5"
					placeholder="No limit"
					class="field"
					bind:value={maxMinutes}
				/>
				<span class="field-suffix" aria-hidden="true">min</span>
			</span>
		</label>
	</div>
</section>
