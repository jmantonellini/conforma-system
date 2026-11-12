<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		id,
		error,
		ayuda,
		required,
		class: clase,
		children
	}: {
		label?: string;
		id: string;
		error?: string;
		ayuda?: string;
		required?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class={['campo', clase]}>
	{#if label}
		<label for={id}>
			{label}
			{#if required}<span class="text-error">*</span>{/if}
		</label>
	{/if}
	{@render children()}
	{#if error}
		<p class="text-xs text-error">{error}</p>
	{:else if ayuda}
		<p class="text-xs text-base-content/60">{ayuda}</p>
	{/if}
</div>
