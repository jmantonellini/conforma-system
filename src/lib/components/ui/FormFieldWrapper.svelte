<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		id,
		error,
		required,
		children
	}: {
		label: string;
		id: string;
		error?: string;
		required?: boolean;
		children: Snippet;
	} = $props();
</script>

<div class="flex w-full flex-col gap-2">
	<label for={id} class="label">
		{label}
		{#if required}<span class="text-error">*</span>{/if}
	</label>
	{@render children()}
	{#if error}
		<p class="text-sm text-error">{error}</p>
	{/if}
</div>
