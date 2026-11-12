<script lang="ts">
	import CotizacionLineaFila from '$lib/modulos/cotizaciones/componentes/CotizacionLineaFila.svelte';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/modulos/cotizaciones/tipos';
	import { formatearDosDecimales, formatearMoneda } from '$lib/utils/precios';

	type Props = {
		lineas: LineaEdicion[];
		bloqueada: boolean;
		productos: ProductoOpcion[];
		onBuscarProducto?: (search: string) => Promise<void>;
		insumos: InsumoOpcion[];
		descuentoGlobal: number;
		totalBase: number;
		importeDescuento: number;
		incluirIva: boolean;
		importeIva: number;
		onAgregarInsumoAsociado: (lineaId: number, insumoId: number, cantidad: number) => void;
		onQuitarInsumoAsociado: (lineaId: number, indice: number) => void;
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
		onBuscarProducto,
		insumos,
		descuentoGlobal,
		totalBase,
		importeDescuento,
		incluirIva,
		importeIva,
		onAgregarInsumoAsociado,
		onQuitarInsumoAsociado,
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

<div class="overflow-x-auto rounded-box border border-base-300 xl:overflow-visible">
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
					{onBuscarProducto}
					{insumos}
					{onEliminar}
					{onSeleccionarProducto}
					{onSeleccionarInsumo}
					{onActualizarCantidad}
					{onActualizarDescripcion}
					{onActualizarPrecio}
					{onCambiarVisibilidad}
					{onActualizarCostoInterno}
					{onAgregarInsumoAsociado}
					{onQuitarInsumoAsociado}
				/>
			{/each}
			{#if descuentoGlobal > 0}
				<tr>
					<td colspan="3" class="text-right font-semibold">Subtotal</td>
					<td class="text-right font-semibold whitespace-nowrap tabular-nums">
						{formatearMoneda(totalBase)}
					</td>
					<td colspan="2"></td>
				</tr>
				<tr>
					<td colspan="3" class="text-right font-semibold">
						Descuento general ({formatearDosDecimales(descuentoGlobal)}%)
					</td>
					<td class="text-right font-semibold whitespace-nowrap tabular-nums">
						-{formatearMoneda(importeDescuento)}
					</td>
					<td colspan="2"></td>
				</tr>
			{/if}
			{#if incluirIva}
				<tr>
					<td colspan="3" class="text-right font-semibold">IVA (21%)</td>
					<td class="text-right font-semibold whitespace-nowrap tabular-nums">
						{formatearMoneda(importeIva)}
					</td>
					<td colspan="2"></td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>
