<script lang="ts">
	let { title, description }: { title: string; description?: string } = $props();
</script>

<div class="mb-8">
	<h1 class="text-2xl font-bold">{title}</h1>
	{#if description}
		<p class="mt-2 text-base-content/70">{description}</p>
	{/if}
</div>
