<script lang="ts" module>
	export type AccionModal = {
		etiqueta: string;
		/** `id` del `<form>` que envía el botón; si no se indica, se usa `onclick`. */
		form?: string;
		onclick?: () => unknown;
		pendiente?: boolean;
		deshabilitada?: boolean;
		peligro?: boolean;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import Icono from './Icono.svelte';

	let {
		open = $bindable(false),
		titulo,
		descripcion,
		ancho = 'md',
		lateral = false,
		accion,
		acciones,
		alCerrar,
		children
	}: {
		open?: boolean;
		titulo: string;
		descripcion?: string;
		ancho?: 'sm' | 'md' | 'lg';
		/** Panel que entra desde la derecha a pantalla completa de alto (alta rápida sin salir del formulario). */
		lateral?: boolean;
		/** Botón principal del pie; junto a él se muestra siempre "Cancelar". */
		accion?: AccionModal;
		/** Pie a medida (reemplaza Cancelar + acción). */
		acciones?: Snippet;
		alCerrar?: () => void;
		children: Snippet;
	} = $props();

	const ANCHOS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' };

	const animacion = (nodo: Element) =>
		lateral ? fly(nodo, { x: 320, duration: 200 }) : scale(nodo, { start: 0.97, duration: 150 });

	function mostrar(dialogo: HTMLDialogElement) {
		if (!dialogo.open) dialogo.showModal();
	}

	function cerrar() {
		if (!open) return;
		open = false;
		alCerrar?.();
	}
</script>

{#if open}
	<dialog
		{@attach mostrar}
		class={['modal', lateral ? 'modal-end' : 'modal-bottom sm:modal-middle']}
		onclose={cerrar}
	>
		<div
			class={[
				'modal-box flex w-full flex-col p-0 shadow-xl',
				lateral ? 'h-full max-h-none rounded-none sm:max-w-md' : ['max-h-[90vh]', ANCHOS[ancho]]
			]}
			transition:animacion
		>
			<header class="flex items-start justify-between gap-4 px-5 pt-4 pb-1">
				<div>
					<h3 class="text-base font-semibold">{titulo}</h3>
					{#if descripcion}<p class="mt-0.5 text-sm text-base-content/60">{descripcion}</p>{/if}
				</div>
				<button
					type="button"
					class="btn -mr-2 btn-square btn-ghost btn-sm"
					aria-label="Cerrar"
					onclick={cerrar}
				>
					<Icono nombre="cerrar" />
				</button>
			</header>

			<div class={['modal-cuerpo', lateral && 'flex-1']}>{@render children()}</div>

			<footer class="flex justify-end gap-2 border-t border-base-300 bg-base-200/50 px-5 py-3">
				{#if acciones}
					{@render acciones()}
				{:else if accion}
					<button type="button" class="btn btn-ghost btn-sm" onclick={cerrar}>Cancelar</button>
					<button
						type={accion.form ? 'submit' : 'button'}
						form={accion.form}
						class={['btn btn-sm', accion.peligro ? 'btn-error' : 'btn-primary']}
						disabled={accion.pendiente || accion.deshabilitada}
						onclick={accion.form ? undefined : accion.onclick}
					>
						{#if accion.pendiente}<span class="loading loading-xs loading-spinner"></span>{/if}
						{accion.etiqueta}
					</button>
				{:else}
					<button type="button" class="btn btn-sm" onclick={cerrar}>Cerrar</button>
				{/if}
			</footer>
		</div>
		<form method="dialog" class="modal-backdrop bg-base-content/25 backdrop-blur-[2px]">
			<button tabindex="-1">Cerrar</button>
		</form>
	</dialog>
{/if}
