<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icono from './Icono.svelte';
	import { ordenar, parametro } from './url-filtros';

	let {
		clave,
		porDefecto,
		class: clase = '',
		children
	}: {
		clave: string;
		porDefecto: string;
		class?: string;
		children: Snippet;
	} = $props();

	const activa = $derived(parametro('sort', porDefecto) === clave);
	const descendente = $derived(parametro('direction', 'asc') === 'desc');
</script>

<th class={clase} aria-sort={activa ? (descendente ? 'descending' : 'ascending') : undefined}>
	<button
		type="button"
		class={[
			'inline-flex items-center gap-1 uppercase hover:text-base-content',
			activa && 'text-base-content'
		]}
		onclick={() => ordenar(clave, porDefecto)}
	>
		{@render children()}
		<Icono
			nombre={activa && descendente ? 'abajo' : 'arriba'}
			class={['size-3', activa ? 'opacity-100' : 'opacity-0'].join(' ')}
		/>
	</button>
</th>
