<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Can,
		ColumnaOrden,
		Highlight,
		Icono,
		Listado,
		TarjetaImagen,
		filtrar,
		parametro
	} from '$lib/ui';
	import {
		eliminarProducto,
		getCategorias,
		getProductos
	} from '$lib/modulos/productos/productos.remote';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { formatearMoneda } from '$lib/utils/precios';
	import { formatearAnios } from '$lib/modulos/productos/anios';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const busqueda = $derived(parametro('search'));
	const listado = $derived(getProductos(data.filtros));
	const resultado = $derived(await listado);
	const listaCategorias = $derived(await getCategorias());
	const categorias = $derived(new Map(listaCategorias.map((c) => [c.id, c.nombre])));
</script>

<Listado
	titulo="Productos"
	datos={resultado.data}
	total={resultado.total}
	pagina={resultado.currentPage}
	paginas={resultado.totalPages}
	buscar="Código, nombre, marca, modelo, año..."
	vacio="No hay productos para estos filtros"
>
	{#snippet acciones()}
		<Can modulo="productos" accion="create">
			<a class="btn btn-primary btn-sm" href={resolve('/productos/crear')}>
				<Icono nombre="mas_simple" /> Nuevo producto
			</a>
		</Can>
	{/snippet}
	{#snippet filtros()}
		<select
			class="select w-48 select-sm"
			value={parametro('categoria')}
			onchange={(e) => filtrar({ categoria: e.currentTarget.value })}
		>
			<option value="">Todas las categorías</option>
			{#each listaCategorias as categoria (categoria.id)}
				<option value={String(categoria.id)}>{categoria.nombre}</option>
			{/each}
		</select>
	{/snippet}
	{#snippet header()}
		<ColumnaOrden clave="nombre" porDefecto="nombre">Producto</ColumnaOrden>
		<th>Categoría</th>
		<th>Vehículo</th>
		<th class="text-right">Costo receta</th>
		<th class="text-right">Precio lista</th>
		<th></th>
	{/snippet}
	{#snippet row(producto: (typeof resultado.data)[number])}
		<td>
			<a class="enlace-fila" href={resolve(`/productos/${producto.id}`)}>
				<Highlight text={producto.nombre} query={busqueda} />
			</a>
			<p class="secundario font-mono"><Highlight text={producto.codigo} query={busqueda} /></p>
			{#if producto.receta_pendiente}
				<span class="badge badge-soft badge-xs badge-warning">Receta pendiente</span>
			{/if}
		</td>
		<td class="text-base-content/70">{categorias.get(producto.categoria_id ?? 0) ?? '-'}</td>
		<td>
			<Highlight
				text={[
					producto.marca?.nombre,
					producto.modelo?.nombre,
					formatearAnios(producto.anio_desde, producto.anio_hasta)
				]
					.filter(Boolean)
					.join(' · ') || '-'}
				query={busqueda}
			/>
		</td>
		<td class="numero text-base-content/70">{formatearMoneda(producto.costo_materiales)}</td>
		<td class="numero font-medium">{formatearMoneda(producto.precio_venta)}</td>
		<td class="w-0">
			<Can modulo="productos" accion="delete">
				<button
					class="btn btn-square btn-ghost text-base-content/50 btn-sm hover:text-error"
					title="Eliminar"
					onclick={() =>
						confirmarYEjecutar({
							mensaje: `¿Eliminar el producto ${producto.nombre}?`,
							ejecutar: () => eliminarProducto(producto.id).updates(listado),
							exito: 'Producto eliminado'
						})}
				>
					<Icono nombre="papelera" />
				</button>
			</Can>
		</td>
	{/snippet}
	{#snippet tarjeta(producto: (typeof resultado.data)[number])}
		<TarjetaImagen
			href={`/productos/${producto.id}`}
			imagen={producto.portada_id ? resolve(`/adjuntos/${producto.portada_id}`) : null}
			titulo={producto.nombre}
			subtitulo={[producto.codigo, categorias.get(producto.categoria_id ?? 0)]
				.filter(Boolean)
				.join(' · ')}
		>
			<div class="flex items-center justify-between gap-2">
				<span class="font-semibold tabular-nums">{formatearMoneda(producto.precio_venta)}</span>
				{#if producto.receta_pendiente}
					<span class="badge badge-soft badge-xs badge-warning">Receta pendiente</span>
				{/if}
			</div>
		</TarjetaImagen>
	{/snippet}
</Listado>
