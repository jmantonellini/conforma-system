<script lang="ts">
	import CotizacionLineaFila from '$lib/components/cotizaciones/CotizacionLineaFila.svelte';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/types/cotizacion-editor';
	import { formatearDosDecimales } from '$lib/utils/precios';

	type Props = {
		lineas: LineaEdicion[];
		bloqueada: boolean;
		productos: ProductoOpcion[];
		insumos: InsumoOpcion[];
		descuentoGlobal: number;
		totalBase: number;
		importeDescuento: number;
		incluirIva: boolean;
		importeIva: number;
		onEliminar: (lineaId: number) => void;
		onSeleccionarProducto: (lineaId: number, productoId: string) => void;
		onSeleccionarInsumo: (lineaId: number, insumoId: string) => void;
		onActualizarCantidad: (lineaId: number, cantidad: number) => void;
		onActualizarDescripcion: (lineaId: number, descripcion: string) => void;
		onActualizarPrecio: (lineaId: number, precio: string) => void;
		onCambiarVisibilidad: (lineaId: number, visible: boolean) => void;
		onActualizarCostoInterno: (lineaId: number, costo: number) => void;
	};

	let {
		lineas,
		bloqueada,
		productos,
		insumos,
		descuentoGlobal,
		totalBase,
		importeDescuento,
		incluirIva,
		importeIva,
		onEliminar,
		onSeleccionarProducto,
		onSeleccionarInsumo,
		onActualizarCantidad,
		onActualizarDescripcion,
		onActualizarPrecio,
		onCambiarVisibilidad,
		onActualizarCostoInterno
	}: Props = $props();
</script>

<div class="overflow-visible rounded-box border border-base-300">
	<table class="table min-w-232 table-sm">
		<thead>
			<tr>
				<th>Artículo / concepto</th>
				<th class="w-28 text-right">Cantidad</th>
				<th class="w-40 text-right">Precio / costo unitario</th>
				<th class="w-40 text-right">Subtotal</th>
				<th class="w-10 text-center">Visible</th>
				<th class="w-12"></th>
			</tr>
		</thead>
		<tbody>
			{#each lineas as linea (linea.idx)}
				<CotizacionLineaFila
					{linea}
					{bloqueada}
					cantidadLineas={lineas.length}
					{productos}
					{insumos}
					{onEliminar}
					{onSeleccionarProducto}
					{onSeleccionarInsumo}
					{onActualizarCantidad}
					{onActualizarDescripcion}
					{onActualizarPrecio}
					{onCambiarVisibilidad}
					{onActualizarCostoInterno}
				/>
			{/each}
			{#if descuentoGlobal > 0}
				<tr>
					<td colspan="4" class="text-right font-semibold">Subtotal</td>
					<td class="text-right font-semibold">
						${formatearDosDecimales(totalBase)}
					</td>
					<td></td>
				</tr>
				<tr>
					<td colspan="4" class="text-right font-semibold">
						Descuento general ({formatearDosDecimales(descuentoGlobal)}%)
					</td>
					<td class="text-right font-semibold">
						-${formatearDosDecimales(importeDescuento)}
					</td>
					<td></td>
				</tr>
			{/if}
			{#if incluirIva}
				<tr>
					<td colspan="4" class="text-right font-semibold">IVA (21%)</td>
					<td class="text-right font-semibold">
						${formatearDosDecimales(importeIva)}
					</td>
					<td></td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>
