<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import LineasConceptosEditor from '$lib/components/cotizaciones/LineasConceptosEditor.svelte';
	import CotizacionTotales from '$lib/components/cotizaciones/CotizacionTotales.svelte';
	import { cotizarCotizacion } from '$lib/remote/cotizaciones.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		calcularCostoComposicion,
		calcularIva21,
		formatearDosDecimales,
		parsearNumeroDecimal,
		precioNetoCubreCosto,
		redondearPrecio
	} from '$lib/utils/precios';
	import type {
		InsumoOpcion,
		LineaEdicion,
		LineaInicial,
		ProductoOpcion
	} from '$lib/types/cotizacion-editor';

	type Props = {
		cotizacionId: number;
		bloqueada: boolean;
		validezInicial: number;
		precioTotalInicial: number | null;
		descuentoGlobalInicial: number;
		incluirIvaInicial: boolean;
		condicionesPagoInicial: string | null;
		lineasIniciales: LineaInicial[];
		productos: ProductoOpcion[];
		insumos: InsumoOpcion[];
		tiposInsumo: { id: number; nombre: string }[];
		categoriasInsumo: { id: number; nombre: string }[];
		unidadesInsumo: { id: number; nombre: string }[];
	};

	let {
		cotizacionId,
		bloqueada,
		validezInicial,
		precioTotalInicial,
		descuentoGlobalInicial,
		incluirIvaInicial,
		condicionesPagoInicial,
		lineasIniciales,
		productos,
		insumos,
		tiposInsumo,
		categoriasInsumo,
		unidadesInsumo
	}: Props = $props();
	let incluirIva = $state(untrack(() => incluirIvaInicial));
	let descuentoGlobal = $state(untrack(() => descuentoGlobalInicial));
	let condicionesPago = $state(
		untrack(() => condicionesPagoInicial ?? '50% de anticipo al aprobar, saldo contra entrega.')
	);
	let validezDias = $state(untrack(() => validezInicial));
	let precioTotalIngresado = $state<string | null>(
		untrack(() => (precioTotalInicial === null ? null : formatearDosDecimales(precioTotalInicial)))
	);
	let guardando = $state(false);

	function cargarLineasIniciales(): LineaEdicion[] {
		return lineasIniciales.map((linea) => {
			const producto = productos.find((item) => item.id === linea.producto_id);
			const insumo = insumos.find((item) => item.id === linea.insumo_id);
			const insumos_snapshot = (
				Array.isArray(linea.insumos_snapshot) ? linea.insumos_snapshot : []
			).map((material) => {
				const insumoActual = insumos.find((item) => item.id === material.insumo_id);
				if (!insumoActual) return material;
				return {
					...material,
					codigo: insumoActual.codigo,
					nombre: insumoActual.nombre,
					unidad: insumoActual.unidad,
					costo_unitario: insumoActual.costo_unitario,
					subtotal: material.cantidad * insumoActual.costo_unitario
				};
			});
			const precioMinimo = producto?.precio_venta ?? insumo?.costo_unitario ?? 0;
			const costoMateriales =
				producto?.costo_materiales ??
				insumo?.costo_unitario ??
				(linea.producto_id === null && linea.insumo_id === null && insumos_snapshot.length
					? calcularCostoComposicion(insumos_snapshot)
					: linea.costo_materiales);
			return {
				idx: linea.id,
				tipo: linea.producto_id ? 'producto' : linea.insumo_id ? 'insumo' : 'concepto',
				visible_cliente: linea.visible_cliente,
				producto_id: linea.producto_id ? String(linea.producto_id) : '',
				insumo_id: linea.insumo_id ?? undefined,
				insumos_snapshot,
				unidad: linea.insumo_unidad ?? '',
				descripcion: linea.descripcion,
				cantidad: linea.cantidad,
				precio_unitario: redondearPrecio(linea.precio_unitario),
				precio_lista_unitario: redondearPrecio(Math.max(linea.precio_lista_unitario, precioMinimo)),
				precio_minimo_unitario: redondearPrecio(precioMinimo),
				costo_materiales: redondearPrecio(costoMateriales ?? 0)
			};
		});
	}

	let lineas = $derived.by(cargarLineasIniciales);
	let totalBase = $derived(
		redondearPrecio(
			lineas
				.filter((linea) => linea.visible_cliente)
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
		)
	);
	let importeDescuento = $derived(redondearPrecio(totalBase * (descuentoGlobal / 100)));
	let baseImponible = $derived(redondearPrecio(totalBase - importeDescuento));
	let importeIva = $derived(incluirIva ? calcularIva21(baseImponible) : 0);
	let totalCalculado = $derived(redondearPrecio(baseImponible + importeIva));
	let totalFinal = $derived(
		redondearPrecio(parsearNumeroDecimal(precioTotalIngresado ?? '') ?? totalCalculado)
	);
	let costoTotal = $derived(
		calcularCostoComposicion(
			lineas.map((linea) => ({ cantidad: linea.cantidad, costo_unitario: linea.costo_materiales }))
		)
	);
	let totalValido = $derived(
		precioTotalIngresado === null || parsearNumeroDecimal(precioTotalIngresado) !== null
	);
	let netoTotalFinal = $derived(incluirIva ? redondearPrecio(totalFinal / 1.21) : totalFinal);
	let cubreCostos = $derived(totalValido && precioNetoCubreCosto(netoTotalFinal, costoTotal));

	function finalizarEdicionTotal() {
		const total = parsearNumeroDecimal(precioTotalIngresado ?? '');
		if (total !== null) precioTotalIngresado = formatearDosDecimales(redondearPrecio(total));
	}

	async function guardarCotizacion() {
		guardando = true;
		try {
			await cotizarCotizacion({
				cotizacion_id: cotizacionId,
				validez_dias: Number(validezDias) || 15,
				precio_total: totalFinal,
				descuento_global_porcentaje: descuentoGlobal,
				incluir_iva: incluirIva,
				condiciones_pago: condicionesPago.trim(),
				lineas: lineas.map((linea) => ({
					visible_cliente: linea.visible_cliente,
					producto_id: linea.producto_id || undefined,
					insumo_id: linea.insumo_id ? Number(linea.insumo_id) : undefined,
					nuevo_insumo: linea.nuevo_insumo,
					descripcion: linea.descripcion || '',
					cantidad: Number(linea.cantidad) || 1,
					precio_unitario: Number(linea.precio_unitario) || 0,
					precio_lista_unitario: Number(linea.precio_lista_unitario) || 0,
					insumos_asociados:
						linea.tipo === 'concepto'
							? linea.insumos_snapshot
									.filter((material) => material.insumo_id != null)
									.map((material) => ({
										insumo_id: Number(material.insumo_id),
										cantidad: material.cantidad
									}))
							: [],
					costo_materiales: redondearPrecio(Number(linea.costo_materiales) || 0)
				}))
			});
			toast.success('Cotización guardada');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Error al guardar la cotización');
		} finally {
			guardando = false;
		}
	}
</script>

<LineasConceptosEditor
	bind:lineas
	{productos}
	{insumos}
	{tiposInsumo}
	{categoriasInsumo}
	{unidadesInsumo}
	{bloqueada}
	contexto="cotización"
	{descuentoGlobal}
	{totalBase}
	{importeDescuento}
	{incluirIva}
	{importeIva}
	onChange={() => (precioTotalIngresado = null)}
/>

<CotizacionTotales
	{bloqueada}
	{guardando}
	{validezDias}
	{totalFinal}
	{precioTotalIngresado}
	{totalValido}
	{incluirIva}
	{descuentoGlobal}
	{cubreCostos}
	{condicionesPago}
	onCambiarValidez={(dias) => (validezDias = dias)}
	onCambiarIva={(incluir) => {
		precioTotalIngresado = null;
		incluirIva = incluir;
	}}
	onCambiarDescuento={(porcentaje) => {
		precioTotalIngresado = null;
		descuentoGlobal = porcentaje;
	}}
	onActualizarTotal={(valor) => (precioTotalIngresado = valor)}
	onFinalizarEdicionTotal={finalizarEdicionTotal}
	onCambiarCondiciones={(condiciones) => (condicionesPago = condiciones)}
	onGuardar={guardarCotizacion}
/>
