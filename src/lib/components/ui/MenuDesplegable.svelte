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

	/** Elegir una opción (botón o enlace) cierra el menú. */
	function cerrarAlElegir(menu: HTMLElement) {
		const cerrar = (evento: Event) => {
			if ((evento.target as Element).closest('button, a')) menu.hidePopover();
		};
		menu.addEventListener('click', cerrar);
		return () => menu.removeEventListener('click', cerrar);
	}
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
	{@attach cerrarAlElegir}
>
	{@render children()}
</ul>
