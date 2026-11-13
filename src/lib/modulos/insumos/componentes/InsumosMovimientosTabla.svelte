<script lang="ts">
	import { resolve } from '$app/paths';
	import { Table } from '$lib/ui';
	import { getMovimientosInsumos } from '$lib/modulos/insumos/insumos.remote';
	import { formatearFecha } from '$lib/utils/fechas';

	type Movimiento = Awaited<ReturnType<typeof getMovimientosInsumos>>[number];
	type Grupo = { clave: string; lote: number | null; movimientos: Movimiento[] };

	let {
		movimientos,
		emptyMessage = 'Sin movimientos registrados',
		mostrarOrden = true
	}: { movimientos: Movimiento[]; emptyMessage?: string; mostrarOrden?: boolean } = $props();

	const grupos = $derived.by(() => {
		const porLote: Record<number, Grupo> = {};
		const resultado: Grupo[] = [];
		for (const movimiento of movimientos) {
			if (movimiento.lote_id === null) {
				resultado.push({ clave: `m-${movimiento.id}`, lote: null, movimientos: [movimiento] });
				continue;
			}
			const existente = porLote[movimiento.lote_id];
			if (existente) {
				existente.movimientos.push(movimiento);
				continue;
			}
			const grupo = {
				clave: `l-${movimiento.lote_id}`,
				lote: movimiento.lote_id,
				movimientos: [movimiento]
			};
			porLote[movimiento.lote_id] = grupo;
			resultado.push(grupo);
		}
		return resultado;
	});

	const formatearCantidad = (valor: number) =>
		new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(valor);

	function etiqueta(grupo: Grupo) {
		const [primero] = grupo.movimientos;
		if (grupo.lote !== null) return 'Consumo por lote';
		if (primero.tipo === 'ingreso') return 'Ingreso';
		return primero.fuente === 'receta' ? 'Consumo por receta' : 'Consumo';
	}
</script>

{#snippet header()}
	<th>Fecha</th>
	<th>Movimiento</th>
	<th>Insumo</th>
	<th class="text-right">Cantidad</th>
	<th>Empleado</th>
	{#if mostrarOrden}<th>Orden</th>{/if}
	<th>Motivo</th>
{/snippet}

{#snippet row(grupo: Grupo)}
	{@const primero = grupo.movimientos[0]}
	<td class="whitespace-nowrap">
		{primero.created_at ? formatearFecha(new Date(primero.created_at)) : '-'}
	</td>
	<td class="whitespace-nowrap">
		{etiqueta(grupo)}
		{#if grupo.lote !== null}
			<span class="badge badge-ghost badge-sm">#{grupo.lote}</span>
		{/if}
	</td>
	<td class="min-w-56">
		{#if grupo.lote !== null && grupo.movimientos.length > 1}
			<details>
				<summary class="cursor-pointer font-medium">
					{grupo.movimientos.length} insumos
				</summary>
				<ul class="mt-2 flex flex-col gap-1 text-sm">
					{#each grupo.movimientos as item (item.id)}
						<li class="flex justify-between gap-4">
							<span>{item.insumo.codigo} · {item.insumo.nombre}</span>
							<span class="whitespace-nowrap tabular-nums">
								{formatearCantidad(item.cantidad)}
								{item.insumo.unidad}
							</span>
						</li>
					{/each}
				</ul>
			</details>
		{:else}
			{primero.insumo.codigo} · {primero.insumo.nombre}
		{/if}
	</td>
	<td class="text-right whitespace-nowrap tabular-nums">
		{#if grupo.movimientos.length === 1}
			{formatearCantidad(primero.cantidad)} {primero.insumo.unidad}
		{:else}
			-
		{/if}
	</td>
	<td class="whitespace-nowrap">{primero.empleado.nombre} {primero.empleado.apellido}</td>
	{#if mostrarOrden}
		<td class="whitespace-nowrap">
			{#if primero.orden_fabricacion_id}
				<a class="link link-hover" href={resolve(`/fabricacion/${primero.orden_fabricacion_id}`)}>
					OF-{primero.orden_fabricacion_id}
				</a>
			{:else}
				-
			{/if}
		</td>
	{/if}
	<td>{primero.motivo}</td>
{/snippet}

<Table data={grupos} {header} {row} {emptyMessage} />
