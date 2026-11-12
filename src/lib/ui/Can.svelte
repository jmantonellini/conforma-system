<script lang="ts">
	import { page } from '$app/state';
	import { can } from '$lib/utils/permissions';
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

{#if can(page.data.user, page.data.permisos, modulo, accion)}
	{@render children()}
{/if}
