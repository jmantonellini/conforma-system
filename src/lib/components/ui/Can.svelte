<script lang="ts">
	import { can } from '$lib/stores/auth.svelte';
	import type { Snippet } from 'svelte';

	let {
		modulo,
		accion = 'view',
		children
	} = $props<{
		modulo: string;
		accion?: string;
		children: () => Snippet;
	}>();
</script>

{#if can(modulo, accion)}
	{@render children()}
{/if}
