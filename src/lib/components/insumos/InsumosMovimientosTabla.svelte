<script lang="ts">
	import { Table } from '$lib/components/ui';
	import { getMovimientosInsumos } from '$lib/remote/insumos.remote';
	import { formatearFecha } from '$lib/utils/fechas';

	type Movimiento = Awaited<ReturnType<typeof getMovimientosInsumos>>[number];
	let {
		movimientos,
		emptyMessage = 'Sin movimientos registrados'
	}: { movimientos: Movimiento[]; emptyMessage?: string } = $props();

	const formatearCantidad = (valor: number) =>
		new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(valor);
</script>

{#snippet header()}
	<th>Fecha</th>
	<th>Movimiento</th>
	<th>Insumo</th>
	<th class="text-right">Cantidad</th>
	<th>Empleado</th>
	<th>Orden</th>
	<th>Motivo</th>
{/snippet}

{#snippet row(movimiento: Movimiento)}
	<td>{movimiento.created_at ? formatearFecha(new Date(movimiento.created_at)) : '-'}</td>
	<td>
		{movimiento.tipo === 'ingreso'
			? 'Ingreso'
			: movimiento.fuente === 'receta'
				? 'Consumo por receta'
				: 'Consumo'}
	</td>
	<td>{movimiento.insumo.codigo} · {movimiento.insumo.nombre}</td>
	<td class="text-right">{formatearCantidad(movimiento.cantidad)} {movimiento.insumo.unidad}</td>
	<td>{movimiento.empleado.nombre} {movimiento.empleado.apellido}</td>
	<td>{movimiento.orden_fabricacion_id ? `OF-${movimiento.orden_fabricacion_id}` : '-'}</td>
	<td>{movimiento.motivo}</td>
{/snippet}

<Table data={movimientos} {header} {row} {emptyMessage} />
