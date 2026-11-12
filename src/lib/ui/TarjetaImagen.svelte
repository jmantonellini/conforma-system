<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import Icono from './Icono.svelte';

	let {
		href,
		imagen,
		titulo,
		subtitulo,
		children
	}: {
		href: Pathname;
		imagen?: string | null;
		titulo: string;
		subtitulo?: string | null;
		children?: Snippet;
	} = $props();
</script>

<a
	href={resolve(href as '/')}
	class="group flex h-full flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors hover:border-primary"
>
	<div class="aspect-4/3 overflow-hidden bg-base-200">
		{#if imagen}
			<img
				src={imagen}
				alt=""
				loading="lazy"
				class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
			/>
		{:else}
			<div class="grid size-full place-items-center text-base-content/30">
				<Icono nombre="imagen" class="size-10" />
			</div>
		{/if}
	</div>
	<div class="flex flex-1 flex-col gap-1 p-3">
		<p class="line-clamp-2 text-sm font-medium group-hover:text-primary">{titulo}</p>
		{#if subtitulo}<p class="secundario truncate font-mono">{subtitulo}</p>{/if}
		{#if children}<div class="mt-auto pt-2 text-sm">{@render children()}</div>{/if}
	</div>
</a>
