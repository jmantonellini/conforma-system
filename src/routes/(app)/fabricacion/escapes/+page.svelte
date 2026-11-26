<script lang="ts">
	import { resolve } from '$app/paths';
	import { EstadoBadge, Highlight, Icono, Listado, parametro } from '$lib/ui';
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
	{#snippet acciones()}
		<a class="btn btn-ghost btn-sm" href={resolve('/fabricacion')}>
			<Icono nombre="izquierda" /> Volver a Fabricación
		</a>
	{/snippet}
	{#snippet header()}
		<th>N° grabado</th>
		<th>Fecha</th>
		<th>Descripción</th>
		<th>Cliente</th>
		<th>OF</th>
		<th>Estado</th>
	{/snippet}
	{#snippet row(unidad: (typeof resultado.unidades)[number])}
		<td class="font-semibold whitespace-nowrap tabular-nums">
			<a class="enlace-fila" href={resolve(`/fabricacion/escapes/${unidad.id}`)}>
				<Highlight text={String(unidad.numero)} query={busqueda} />
			</a>
			{#if unidad.adjuntos > 0}
				<span
					class="ml-1 inline-flex items-center gap-0.5 text-xs font-normal text-base-content/60"
					title="{unidad.adjuntos} fotos o planos"
				>
					<Icono nombre="camara" class="size-3.5" />{unidad.adjuntos}
				</span>
			{/if}
		</td>
		<td class="text-base-content/70">{formatearFecha(unidad.fecha)}</td>
		<td class="max-w-md">
			<p class="font-medium"><Highlight text={unidad.descripcion} query={busqueda} /></p>
			{#if unidad.producto && unidad.producto_id}
				<a class="link text-sm link-hover" href={resolve(`/productos/${unidad.producto_id}`)}>
					{unidad.producto}
				</a>
			{/if}
			{#if unidad.observaciones}
				<p class="secundario line-clamp-2">{unidad.observaciones}</p>
			{/if}
		</td>
		<td><Highlight text={unidad.cliente ?? '—'} query={busqueda} /></td>
		<td class="whitespace-nowrap">
			{#if unidad.orden_id}
				<a class="link font-mono link-hover" href={resolve(`/fabricacion/${unidad.orden_id}`)}>
					OF-{unidad.orden_id}
				</a>
				{#if unidad.pedido_numero}
					<p class="secundario">{unidad.pedido_numero}</p>
				{/if}
			{:else if unidad.pedido_id}
				<a class="link font-mono link-hover" href={resolve(`/pedidos/${unidad.pedido_id}`)}>
					{unidad.pedido_numero}
				</a>
				<p class="secundario">Sin OF</p>
			{:else}
				<span class="text-base-content/50">Sin OF</span>
			{/if}
		</td>
		<td><EstadoBadge class="badge-sm" estado={unidad.estado} /></td>
	{/snippet}
</Listado>
