<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		etiqueta,
		children,
		class: clase = 'btn btn-sm',
		alFinal = false,
		titulo
	}: {
		etiqueta: Snippet;
		children: Snippet;
		class?: string;
		/** Alinea el menú al borde derecho del botón (menús en el extremo derecho de la pantalla). */
		alFinal?: boolean;
		titulo?: string;
	} = $props();

	const id = $props.id();
</script>

<button
	type="button"
	class={clase}
	title={titulo}
	aria-label={titulo}
	popovertarget={id}
	style:anchor-name="--{id}"
>
	{@render etiqueta()}
</button>
<ul
	{id}
	popover
	class={[
		'menu dropdown w-56 rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg',
		alFinal && 'dropdown-end'
	]}
	style:position-anchor="--{id}"
>
	{@render children()}
</ul>
