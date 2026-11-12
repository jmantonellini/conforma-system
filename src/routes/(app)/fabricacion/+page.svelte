<script lang="ts">
	import { resolve } from '$app/paths';
	import { EstadoBadge, Highlight, Icono, Listado, Persona, filtrar, parametro } from '$lib/ui';
	import {
		getEstadosFabricacion,
		getOrdenesFabricacion
	} from '$lib/modulos/fabricacion/fabricacion-consultas.remote';
	import { ETIQUETA_PRIORIDAD } from '$lib/modulos/fabricacion/tipos';
	import { estaVencido, formatearFecha } from '$lib/utils/fechas';

	const estados = await getEstadosFabricacion();
	const busqueda = $derived(parametro('search'));
	const ordenes = $derived(
		await getOrdenesFabricacion({
			search: busqueda || undefined,
			estado: Number(parametro('estado')) || undefined,
			page: Number(parametro('page')) || 1
		})
	);
</script>

<Listado
	titulo="Fabricación"
	datos={ordenes.ordenes}
	total={ordenes.total}
	pagina={ordenes.currentPage}
	paginas={ordenes.totalPages}
	buscar="Trabajo, pedido, cliente, producto..."
	vacio="No hay órdenes de fabricación para estos filtros"
>
	{#snippet acciones()}
		<a class="btn btn-primary btn-sm" href={resolve('/fabricacion/crear')}>
			<Icono nombre="mas_simple" /> Nueva orden
		</a>
	{/snippet}
	{#snippet filtros()}
		<select
			class="select w-48 select-sm"
			value={parametro('estado')}
			onchange={(e) => filtrar({ estado: e.currentTarget.value })}
		>
			<option value="">Todos los estados</option>
			{#each estados as estado (estado.id)}
				<option value={String(estado.id)}>{estado.nombre}</option>
			{/each}
		</select>
	{/snippet}
	{#snippet header()}
		<th>Orden</th>
		<th>Trabajo</th>
		<th>Estado</th>
		<th>Progreso</th>
		<th>Prioridad</th>
		<th>Responsable</th>
		<th>Entrega</th>
	{/snippet}
	{#snippet row(orden: (typeof ordenes.ordenes)[number])}
		<td>
			<a class="enlace-fila font-mono" href={resolve(`/fabricacion/${orden.id}`)}>
				<Highlight text={`OF-${orden.id}`} query={busqueda} />
			</a>
		</td>
		<td>
			<p class="font-medium"><Highlight text={orden.nombre_trabajo} query={busqueda} /></p>
			<p class="secundario">
				{orden.es_para_stock
					? 'Stock interno'
					: [orden.pedido?.numero, orden.cliente_nombre].filter(Boolean).join(' · ')}
			</p>
		</td>
		<td><EstadoBadge class="badge-sm" estado={orden.estado} /></td>
		<td>
			<div class="flex items-center gap-2">
				<progress
					class="progress w-20 progress-primary"
					value={orden.cantidad_producida}
					max={orden.cantidad_total}
				></progress>
				<span class="text-xs text-base-content/60 tabular-nums">
					{orden.cantidad_producida}/{orden.cantidad_total}
				</span>
			</div>
		</td>
		<td><EstadoBadge class="badge-sm" estado={ETIQUETA_PRIORIDAD[orden.prioridad ?? 0]} /></td>
		<td><Persona nombre={orden.empleado?.nombre} apellido={orden.empleado?.apellido} /></td>
		<td
			class={estaVencido(orden.fecha_fin_estimada) && !orden.estado?.es_final
				? 'font-medium text-error'
				: 'text-base-content/70'}
		>
			{formatearFecha(orden.fecha_fin_estimada)}
		</td>
	{/snippet}
</Listado>
