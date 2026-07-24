<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		id,
		error,
		required,
		class: className,
		children
	}: {
		label?: string;
		id: string;
		error?: string;
		required?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class={`flex w-auto flex-col gap-2 ${className || ''}`}>
	{#if label}
		<label for={id} class="label">
			{label}
			{#if required}<span class="text-error">*</span>{/if}
		</label>
	{/if}
	{@render children()}
	{#if error}
		<p class="text-sm text-error">{error}</p>
	{/if}
</div>
