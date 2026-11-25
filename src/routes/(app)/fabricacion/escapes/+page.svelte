<script lang="ts">
	import { resolve } from '$app/paths';
	import { EstadoBadge, Highlight, Listado, parametro } from '$lib/ui';
	import { getUnidadesFabricadas } from '$lib/modulos/fabricacion/fabricacion-consultas.remote';
	import { formatearFecha } from '$lib/utils/fechas';

	const busqueda = $derived(parametro('search'));
	const resultado = $derived(
		await getUnidadesFabricadas({
			search: busqueda || undefined,
			page: Number(parametro('page')) || 1
		})
	);
</script>

<Listado
	titulo="Escapes fabricados"
	datos={resultado.unidades}
	total={resultado.total}
	pagina={resultado.currentPage}
	paginas={resultado.totalPages}
	buscar="N° grabado, OF, cliente, modelo..."
	vacio="No hay escapes numerados para esta búsqueda"
>
	{#snippet header()}
		<th>N° grabado</th>
		<th>Fecha</th>
		<th>Descripción</th>
		<th>Cliente</th>
		<th>OF</th>
		<th>Estado</th>
	{/snippet}
	{#snippet row(unidad: (typeof resultado.unidades)[number])}
		<td class="font-semibold tabular-nums">
			<Highlight text={String(unidad.numero)} query={busqueda} />
		</td>
		<td class="text-base-content/70">{formatearFecha(unidad.fecha)}</td>
		<td class="max-w-md">
			<p class="font-medium"><Highlight text={unidad.descripcion} query={busqueda} /></p>
			{#if unidad.producto || unidad.observaciones}
				<p class="secundario line-clamp-2">
					{[unidad.producto, unidad.observaciones].filter(Boolean).join(' · ')}
				</p>
			{/if}
		</td>
		<td><Highlight text={unidad.cliente ?? '—'} query={busqueda} /></td>
		<td class="whitespace-nowrap">
			{#if unidad.orden_id}
				<a class="enlace-fila font-mono" href={resolve(`/fabricacion/${unidad.orden_id}`)}>
					OF-{unidad.orden_id}
				</a>
				{#if unidad.pedido_numero}
					<p class="secundario">{unidad.pedido_numero}</p>
				{/if}
			{:else}
				<span class="text-base-content/50">Sin OF</span>
			{/if}
		</td>
		<td><EstadoBadge class="badge-sm" estado={unidad.estado} /></td>
	{/snippet}
</Listado>
