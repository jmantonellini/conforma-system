<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Can,
		ColumnaOrden,
		ExcelMenu,
		Highlight,
		Icono,
		Listado,
		TarjetaImagen,
		filtrar,
		parametro
	} from '$lib/ui';
	import { eliminarInsumo } from '$lib/modulos/insumos/insumos.remote';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { can } from '$lib/utils/permissions';
	import { formatearMoneda } from '$lib/utils/precios';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const busqueda = $derived(parametro('search'));
	const TIPOS = [
		['material', 'Material'],
		['mano_obra', 'Mano de obra'],
		['indirecto', 'Costo indirecto'],
		['herramienta', 'Herramienta']
	] as const;
	const formatearCantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format;
</script>

<Listado
	titulo="Insumos"
	datos={data.insumos.data}
	total={data.insumos.total}
	pagina={data.currentPage}
	paginas={data.insumos.totalPages}
	buscar="Código, descripción, categoría..."
	vacio="No hay insumos para estos filtros"
>
	{#snippet acciones()}
		<Can modulo="insumos" accion="edit">
			<a class="btn btn-sm" href={resolve('/insumos/movimientos')}>Movimientos</a>
		</Can>
		<Can modulo="insumos" accion="create">
			<a class="btn btn-primary btn-sm" href={resolve('/insumos/crear')}>
				<Icono nombre="mas_simple" /> Nuevo insumo
			</a>
		</Can>
	{/snippet}
	{#snippet filtros()}
		<select
			class="select w-44 select-sm"
			value={parametro('tipo')}
			onchange={(e) => filtrar({ tipo: e.currentTarget.value })}
		>
			<option value="">Todos los tipos</option>
			{#each TIPOS as [valor, etiqueta] (valor)}<option value={valor}>{etiqueta}</option>{/each}
		</select>
		<select
			class="select w-48 select-sm"
			value={parametro('categoria')}
			onchange={(e) => filtrar({ categoria: e.currentTarget.value })}
		>
			<option value="">Todas las categorías</option>
			{#each data.categorias as categoria (categoria.id)}
				<option value={String(categoria.id)}>{categoria.nombre}</option>
			{/each}
		</select>
	{/snippet}
	{#snippet herramientas()}
		<ExcelMenu
			importHref={resolve('/insumos/importar')}
			exportHref={resolve('/insumos/exportar')}
			canImport={can(data.user, data.permisos, 'insumos', 'create')}
			canExport={can(data.user, data.permisos, 'insumos', 'view')}
		/>
	{/snippet}
	{#snippet header()}
		<ColumnaOrden clave="nombre" porDefecto="nombre">Insumo</ColumnaOrden>
		<th>Tipo</th>
		<th>Categoría</th>
		<th>Existencia</th>
		<ColumnaOrden clave="costo_unitario" porDefecto="nombre" class="text-right">Costo</ColumnaOrden>
		<th></th>
	{/snippet}
	{#snippet row(insumo: (typeof data.insumos.data)[number])}
		<td class="max-w-80">
			<div class="flex items-center gap-3">
				{#if insumo.imagen_key}
					<img
						class="size-9 shrink-0 rounded-field border border-base-300 object-cover"
						src={resolve(`/insumos/${insumo.id}/imagen`)}
						alt=""
						loading="lazy"
					/>
				{/if}
				<div class="min-w-0">
					<a class="enlace-fila block truncate" href={resolve(`/insumos/${insumo.id}`)}>
						<Highlight text={insumo.nombre} query={busqueda} />
					</a>
					<p class="secundario font-mono"><Highlight text={insumo.codigo} query={busqueda} /></p>
				</div>
			</div>
		</td>
		<td>
			<span class="badge badge-ghost badge-sm whitespace-nowrap">
				{typeof insumo.tipo === 'object' ? insumo.tipo?.nombre : insumo.tipo}
			</span>
		</td>
		<td class="text-base-content/70">
			<Highlight text={insumo.categoria?.nombre ?? 'Sin categoría'} query={busqueda} />
		</td>
		<td class="numero text-left">
			<span class={['font-medium', insumo.stock <= 0 && 'text-error']}>
				{formatearCantidad(insumo.stock)}
			</span>
			<span class="secundario">{insumo.unidad}</span>
		</td>
		<td class="numero">{formatearMoneda(insumo.costo_unitario)}</td>
		<td class="w-0">
			<Can modulo="insumos" accion="delete">
				<button
					class="btn btn-square btn-ghost text-base-content/50 btn-sm hover:text-error"
					title="Eliminar"
					onclick={() =>
						confirmarYEjecutar({
							mensaje: `¿Eliminar el insumo ${insumo.nombre}?`,
							ejecutar: () => eliminarInsumo(insumo.id),
							exito: 'Insumo eliminado'
						})}
				>
					<Icono nombre="papelera" />
				</button>
			</Can>
		</td>
	{/snippet}
	{#snippet tarjeta(insumo: (typeof data.insumos.data)[number])}
		<TarjetaImagen
			href={`/insumos/${insumo.id}`}
			imagen={insumo.imagen_key ? resolve(`/insumos/${insumo.id}/imagen`) : null}
			titulo={insumo.nombre}
			subtitulo={insumo.codigo}
		>
			<div class="flex items-baseline justify-between gap-2">
				<span class={['tabular-nums', insumo.stock <= 0 && 'text-error']}>
					{formatearCantidad(insumo.stock)} <span class="secundario">{insumo.unidad}</span>
				</span>
				<span class="font-semibold tabular-nums">{formatearMoneda(insumo.costo_unitario)}</span>
			</div>
		</TarjetaImagen>
	{/snippet}
</Listado>
