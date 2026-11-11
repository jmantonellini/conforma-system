<script lang="ts" module>
	export type Transicion = {
		estado_destino_id: number;
		destino_nombre: string;
		destino_slug: string;
		destino_color: string | null;
	};
	export type Proceso = {
		cotizacion?: number | null;
		pedido?: number | null;
		fabricacion?: number | null;
	};
	type EstadoFlujo = {
		id: number;
		nombre: string;
		color: string | null;
		grupo: string;
		orden: number;
		es_final: boolean;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { confirmarYEjecutar } from '$lib/stores/confirmacion.svelte';
	import { can } from '$lib/utils/permissions';
	import EstadoBadge from './EstadoBadge.svelte';
	import Icono from './Icono.svelte';
	import MenuDesplegable from './MenuDesplegable.svelte';
	import { claseStatus } from './colores';

	let {
		titulo,
		subtitulo,
		volver,
		estado,
		estados = [],
		transiciones = [],
		onTransicion,
		puedeTransicionar = () => true,
		proceso,
		actual,
		acciones,
		menu,
		eliminar
	}: {
		titulo: string;
		subtitulo?: string | null;
		volver: { href: Pathname; etiqueta: string };
		estado?: { id: number; nombre: string | null; color: string | null } | null;
		/** Estados del flujo, para dibujar la barra de etapas. */
		estados?: EstadoFlujo[];
		transiciones?: Transicion[];
		onTransicion?: (transicion: Transicion) => void;
		puedeTransicionar?: (slug: string) => boolean;
		proceso?: Proceso;
		actual?: keyof Proceso;
		/** Acciones visibles (p. ej. "Generar pedido", "Imprimir"). */
		acciones?: Snippet;
		/** Ítems extra del menú "Más acciones" (<li>…</li>). */
		menu?: Snippet;
		eliminar?: { modulo: string; mensaje: string; onConfirmar: () => Promise<unknown> };
	} = $props();

	const PASOS = [
		{ clave: 'cotizacion', etiqueta: 'Cotización', base: '/cotizaciones' },
		{ clave: 'pedido', etiqueta: 'Pedido', base: '/pedidos' },
		{ clave: 'fabricacion', etiqueta: 'Fabricación', base: '/fabricacion' }
	] as const;
	const pasos = $derived(
		proceso && actual ? PASOS.filter((p) => p.clave === actual || proceso[p.clave]) : []
	);

	/** Etapas visibles: el camino principal (sin excepciones ni finales alternativos) + el estado actual. */
	const etapas = $derived.by(() => {
		const exito = estados.find((e) => e.es_final && e.grupo !== 'excepcion');
		return estados.filter(
			(e) =>
				e.id === estado?.id ||
				(e.grupo !== 'excepcion' && e.grupo !== 'pausado' && (!e.es_final || e === exito))
		);
	});
	const ordenActual = $derived(estados.find((e) => e.id === estado?.id)?.orden ?? -1);

	/** Avanzar en el camino principal es una acción visible; el resto va al menú. */
	const disponibles = $derived(transiciones.filter((t) => puedeTransicionar(t.destino_slug)));
	const esAvance = (t: Transicion) => {
		const destino = etapas.find((e) => e.id === t.estado_destino_id);
		return !estados.length || (!!destino && destino.orden > ordenActual);
	};
	const avances = $derived(disponibles.filter(esAvance));
	const otras = $derived(disponibles.filter((t) => !esAvance(t)));

	const puedeEliminar = $derived(
		!!eliminar && can(page.data.user, page.data.permisos, eliminar.modulo, 'delete')
	);

	const pedirEliminacion = () =>
		eliminar && confirmarYEjecutar({ mensaje: eliminar.mensaje, ejecutar: eliminar.onConfirmar });
</script>

<header class="flex flex-col gap-4">
	<div class="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
		<a
			class="inline-flex w-fit items-center gap-1 text-sm text-base-content/60 hover:text-base-content"
			href={resolve(volver.href as '/')}
		>
			<Icono nombre="izquierda" />
			{volver.etiqueta}
		</a>

		{#if pasos.length > 1}
			<nav class="tabs-box tabs justify-self-center tabs-sm" aria-label="Documentos relacionados">
				{#each pasos as paso (paso.clave)}
					{#if paso.clave === actual}
						<span class="tab-active tab" aria-current="page">{paso.etiqueta}</span>
					{:else}
						<a
							class="tab"
							href={resolve(`${paso.base}/${proceso?.[paso.clave]}` as Pathname as '/')}
						>
							{paso.etiqueta}
						</a>
					{/if}
				{/each}
			</nav>
		{:else}
			<span></span>
		{/if}

		<div class="flex flex-wrap items-center gap-2 md:justify-self-end">
			{@render acciones?.()}
			{#if menu || otras.length || puedeEliminar}
				<MenuDesplegable class="btn btn-square btn-sm" titulo="Más acciones" alFinal>
					{#snippet etiqueta()}<Icono nombre="mas" class="size-5" />{/snippet}
					{#if otras.length}
						<li class="menu-title">Cambiar estado</li>
						{#each otras as transicion (transicion.estado_destino_id)}
							<li>
								<button onclick={() => onTransicion?.(transicion)}>
									<span class={['status', claseStatus(transicion.destino_color)]}></span>
									{transicion.destino_nombre}
								</button>
							</li>
						{/each}
					{/if}
					{@render menu?.()}
					{#if puedeEliminar}
						<li class="mt-1 border-t border-base-300 pt-1">
							<button class="text-error" onclick={pedirEliminacion}>
								<Icono nombre="papelera" /> Eliminar
							</button>
						</li>
					{/if}
				</MenuDesplegable>
			{/if}
		</div>
	</div>

	<div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
		<div class="flex min-w-0 flex-col gap-1">
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-semibold tracking-tight">{titulo}</h1>
				<EstadoBadge {estado} class={etapas.length ? 'lg:hidden' : ''} />
			</div>
			{#if subtitulo}<p class="truncate text-base-content/70">{subtitulo}</p>{/if}
		</div>

		{#if etapas.length}
			<ol class="hidden items-center gap-1 text-xs lg:flex" aria-label="Etapas">
				{#each etapas as etapa, indice (etapa.id)}
					<li class="flex items-center gap-1">
						{#if indice > 0}<Icono nombre="derecha" class="size-3 text-base-content/30" />{/if}
						<span
							class={[
								'rounded-full px-2.5 py-1 whitespace-nowrap',
								etapa.id === estado?.id
									? 'bg-primary font-medium text-primary-content'
									: etapa.orden < ordenActual
										? 'text-base-content/70'
										: 'text-base-content/40'
							]}
							aria-current={etapa.id === estado?.id ? 'step' : undefined}
						>
							{etapa.nombre}
						</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	{#if onTransicion && avances.length}
		<div class="flex flex-wrap gap-2">
			{#each avances as transicion, indice (transicion.estado_destino_id)}
				<button
					class={['btn btn-sm', indice === 0 && 'btn-primary']}
					onclick={() => onTransicion(transicion)}
				>
					{transicion.destino_nombre}
					<Icono nombre="flecha" />
				</button>
			{/each}
		</div>
	{/if}
</header>
