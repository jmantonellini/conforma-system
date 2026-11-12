<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		titulo,
		descripcion,
		acciones,
		children,
		class: clase = ''
	}: {
		titulo?: string;
		descripcion?: string;
		acciones?: Snippet;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<section class={['flex min-w-0 flex-col gap-4 seccion', clase]}>
	{#if titulo || acciones}
		<header class="flex flex-wrap items-start justify-between gap-2">
			<div>
				{#if titulo}<h2 class="font-semibold">{titulo}</h2>{/if}
				{#if descripcion}<p class="text-sm text-base-content/60">{descripcion}</p>{/if}
			</div>
			{#if acciones}
				<div class="flex flex-wrap items-center gap-2">{@render acciones()}</div>
			{/if}
		</header>
	{/if}
	{@render children()}
</section>
