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
		alFinal?: boolean;
		titulo?: string;
	} = $props();

	const id = $props.id();

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
