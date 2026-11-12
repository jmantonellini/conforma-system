<script lang="ts">
	import { claseBadge } from './colores';

	let {
		estado,
		class: clase = ''
	}: { estado?: { nombre: string | null; color: string | null } | null; class?: string } = $props();
</script>

{#if estado?.nombre}
	<span class={['badge badge-soft whitespace-nowrap', claseBadge(estado.color), clase]}>
		{estado.nombre}
	</span>
{/if}
