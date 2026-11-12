<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		Can,
		EstadoBadge,
		Highlight,
		Icono,
		Listado,
		Persona,
		filtrar,
		parametro
	} from '$lib/ui';
	import { eliminarCotizacion } from '$lib/modulos/cotizaciones/cotizaciones.remote';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { CANALES_COTIZACION } from '$lib/modulos/cotizaciones/canales';
	import { formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda } from '$lib/utils/precios';
	import { can } from '$lib/utils/permissions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const veImportes = can(page.data.user, page.data.permisos, 'importes', 'view');
	const busqueda = $derived(parametro('search'));
</script>

<Listado
	titulo="Cotizaciones"
	datos={data.cotizaciones}
	total={data.total}
	pagina={data.currentPage}
	paginas={data.totalPages}
	buscar="Número, cliente, teléfono, CUIT..."
	vacio="No hay cotizaciones para estos filtros"
>
	{#snippet acciones()}
		<Can modulo="cotizaciones" accion="create">
			<a class="btn btn-primary btn-sm" href={resolve('/cotizaciones/crear')}>
				<Icono nombre="mas_simple" /> Nueva cotización
			</a>
		</Can>
	{/snippet}
	{#snippet filtros()}
		<select
			class="select w-48 select-sm"
			value={parametro('estado')}
			onchange={(e) => filtrar({ estado: e.currentTarget.value })}
		>
			<option value="">Todos los estados</option>
			{#each data.estados as estado (estado.id)}
				<option value={String(estado.id)}>{estado.nombre}</option>
			{/each}
		</select>
	{/snippet}
	{#snippet header()}
		<th>Número</th>
		<th>Cliente</th>
		<th>Fecha</th>
		{#if veImportes}<th class="text-right">Total</th>{/if}
		<th>Estado</th>
		<th>Asignada a</th>
		<th></th>
	{/snippet}
	{#snippet row(cot: (typeof data.cotizaciones)[number])}
		<td>
			<a class="enlace-fila font-mono" href={resolve(`/cotizaciones/${cot.id}`)}>
				<Highlight text={cot.numero_cotizacion} query={busqueda} />
			</a>
		</td>
		<td>
			<p class="font-medium"><Highlight text={cot.cliente_nombre || '-'} query={busqueda} /></p>
			<p class="secundario">{CANALES_COTIZACION[cot.canal] ?? cot.canal}</p>
		</td>
		<td class="text-base-content/70">{formatearFecha(cot.created_at)}</td>
		{#if veImportes}
			<td class="numero font-medium">
				{cot.precio_total != null ? formatearMoneda(cot.precio_total) : '-'}
			</td>
		{/if}
		<td>
			<EstadoBadge
				class="badge-sm"
				estado={{ nombre: cot.estado_nombre, color: cot.estado_color }}
			/>
		</td>
		<td
			><Persona
				nombre={cot.asignado_nombre}
				apellido={cot.asignado_apellido}
				vacio="Sin asignar"
			/></td
		>
		<td class="w-0">
			<Can modulo="cotizaciones" accion="delete">
				<button
					class="btn btn-square btn-ghost text-base-content/50 btn-sm hover:text-error"
					title="Eliminar"
					onclick={() =>
						confirmarYEjecutar({
							mensaje: `¿Eliminar la cotización ${cot.numero_cotizacion}?`,
							ejecutar: () => eliminarCotizacion(cot.id),
							exito: 'Cotización eliminada'
						})}
				>
					<Icono nombre="papelera" />
				</button>
			</Can>
		</td>
	{/snippet}
</Listado>
