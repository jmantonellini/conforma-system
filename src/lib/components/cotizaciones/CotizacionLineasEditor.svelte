<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import CotizacionLineasTabla from '$lib/components/cotizaciones/CotizacionLineasTabla.svelte';
	import CotizacionNuevoInsumoDialog from '$lib/components/cotizaciones/CotizacionNuevoInsumoDialog.svelte';
	import CotizacionTotales from '$lib/components/cotizaciones/CotizacionTotales.svelte';
	import { cotizarCotizacion } from '$lib/remote/cotizaciones.remote';
	import { getProductoConReceta } from '$lib/remote/productos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { calcularIva21, redondearPrecio } from '$lib/utils/precios';
	import { Can } from '$lib/components/ui';
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
	const totalBaseInicial = untrack(() =>
		Number(
			lineasIniciales
				.filter((linea) => linea.visible_cliente)
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
				.toFixed(2)
		)
	);
	const baseInicialConDescuento = untrack(() =>
		redondearPrecio(totalBaseInicial * (1 - descuentoGlobalInicial / 100))
	);
	const totalInicialCalculado = untrack(() =>
		redondearPrecio(
			baseInicialConDescuento + (incluirIvaInicial ? calcularIva21(baseInicialConDescuento) : 0)
		)
	);
	const ajusteManualInicial = untrack(() =>
		precioTotalInicial === null ? 0 : redondearPrecio(precioTotalInicial - totalInicialCalculado)
	);
	let incluirIva = $state(untrack(() => incluirIvaInicial));
	let descuentoGlobal = $state(untrack(() => descuentoGlobalInicial));
	let condicionesPago = $state(
		untrack(() => condicionesPagoInicial ?? '50% de anticipo al aprobar, saldo contra entrega.')
	);
	let validezDias = $state(untrack(() => validezInicial));
	let guardando = $state(false);
	let siguienteId = $state(Date.now());
	let nuevoInsumoAbierto = $state(false);
	const atajosAgregar = [
		{ key: 'F1', action: () => agregarLinea('producto') },
		{ key: 'F2', action: () => agregarLinea('insumo') },
		{ key: 'F3', action: () => agregarLinea('concepto') },
		{ key: 'F4', action: abrirNuevoInsumo }
	] as const;

	let lineas = $derived.by<LineaEdicion[]>(() =>
		lineasIniciales.map((linea) => {
			const producto = productos.find((item) => item.id === linea.producto_id);
			const insumo = insumos.find((item) => item.id === linea.insumo_id);
			const precioMinimo = producto?.precio_venta ?? insumo?.costo_unitario ?? 0;
			return {
				idx: linea.id,
				tipo: linea.producto_id ? 'producto' : linea.insumo_id ? 'insumo' : 'concepto',
				visible_cliente: linea.visible_cliente,
				producto_id: linea.producto_id ? String(linea.producto_id) : '',
				insumo_id: linea.insumo_id ?? undefined,
				insumos_snapshot: Array.isArray(linea.insumos_snapshot) ? linea.insumos_snapshot : [],
				unidad: linea.insumo_unidad ?? '',
				descripcion: linea.descripcion,
				cantidad: linea.cantidad,
				precio_unitario: linea.precio_unitario,
				precio_lista_unitario: Math.max(linea.precio_lista_unitario, precioMinimo),
				precio_minimo_unitario: precioMinimo,
				costo_materiales: linea.costo_materiales ?? 0
			};
		})
	);
	let totalBase = $derived(
		Number(
			lineas
				.filter((linea) => linea.visible_cliente)
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
				.toFixed(2)
		)
	);
	let importeDescuento = $derived(redondearPrecio(totalBase * (descuentoGlobal / 100)));
	let baseImponible = $derived(redondearPrecio(totalBase - importeDescuento));
	let importeIva = $derived(incluirIva ? calcularIva21(baseImponible) : 0);
	let totalCalculado = $derived(redondearPrecio(baseImponible + importeIva));
	let precioTotalIngresado = $state<string | null>(null);
	let ajusteManual = $state(ajusteManualInicial);
	let totalFinal = $derived(redondearPrecio(totalCalculado + ajusteManual));

	function lineaVacia(tipo: LineaEdicion['tipo'], idx: number): LineaEdicion {
		return {
			idx,
			tipo,
			visible_cliente: tipo !== 'insumo',
			producto_id: '',
			insumo_id: undefined,
			insumos_snapshot: [],
			unidad: '',
			descripcion: '',
			cantidad: 1,
			precio_unitario: 0,
			precio_lista_unitario: 0,
			precio_minimo_unitario: 0,
			costo_materiales: 0
		};
	}

	function agregarLinea(tipo: LineaEdicion['tipo']) {
		lineas = [...lineas, lineaVacia(tipo, siguienteId++)];
	}

	function actualizarLinea(lineaId: number, cambios: Partial<LineaEdicion>) {
		lineas = lineas.map((linea) => (linea.idx === lineaId ? { ...linea, ...cambios } : linea));
	}

	function cambiarVisibilidad(lineaId: number, visible: boolean) {
		actualizarLinea(lineaId, { visible_cliente: visible });
	}

	function actualizarPrecioUnitario(lineaId: number, valor: string) {
		lineas = lineas.map((linea) => {
			if (linea.idx !== lineaId) return linea;
			const precioLista = Math.max(Number(valor) || 0, linea.precio_minimo_unitario);
			return {
				...linea,
				precio_lista_unitario: precioLista,
				precio_unitario: redondearPrecio(precioLista)
			};
		});
	}

	function eliminarLinea(lineaId: number) {
		if (lineas.length > 1) lineas = lineas.filter((linea) => linea.idx !== lineaId);
	}

	function limpiarLinea(lineaId: number, tipo: LineaEdicion['tipo']) {
		lineas = lineas.map((linea) => (linea.idx === lineaId ? lineaVacia(tipo, lineaId) : linea));
	}

	async function seleccionarProducto(lineaId: number, productoId: string) {
		if (!productoId) {
			limpiarLinea(lineaId, 'producto');
			return;
		}
		const producto = productos.find((item) => item.id === Number(productoId));
		if (!producto) return;

		let insumos_snapshot: LineaEdicion['insumos_snapshot'];
		try {
			const receta = await getProductoConReceta(Number(productoId));
			insumos_snapshot = receta.recetaDirecta.map((material) => {
				if (material.insumo_id) {
					const detalle = receta.receta.find((item) => item.insumo_id === material.insumo_id);
					return {
						insumo_id: material.insumo_id,
						codigo: detalle?.codigo ?? null,
						nombre: detalle?.nombre ?? 'Insumo',
						cantidad: material.cantidad,
						costo_unitario: detalle?.costo_unitario ?? 0,
						unidad: detalle?.unidad ?? '',
						subtotal: (material.cantidad || 0) * (detalle?.costo_unitario ?? 0)
					};
				}

				const nombre =
					receta.componentes.find((componente) => componente.componente_id === material.producto_id)
						?.nombre ?? 'Componente';
				return {
					producto_id: material.producto_id ?? null,
					nombre: `${nombre} (${material.cantidad}x)`,
					cantidad: material.cantidad,
					unidad: 'subproducto',
					costo_unitario: 0,
					subtotal: 0
				};
			});
		} catch {
			insumos_snapshot = [];
		}

		actualizarLinea(lineaId, {
			tipo: 'producto',
			visible_cliente: true,
			producto_id: productoId,
			insumo_id: undefined,
			nuevo_insumo: undefined,
			unidad: '',
			descripcion: producto.nombre,
			costo_materiales: producto.costo_materiales ?? 0,
			precio_lista_unitario: producto.precio_venta,
			precio_minimo_unitario: producto.precio_venta,
			precio_unitario: producto.precio_venta,
			insumos_snapshot
		});
	}

	function seleccionarInsumo(lineaId: number, valor: string) {
		const insumo = insumos.find((item) => item.id === Number(valor));
		if (!insumo) {
			limpiarLinea(lineaId, 'insumo');
			return;
		}

		actualizarLinea(lineaId, {
			tipo: 'insumo',
			visible_cliente: false,
			insumo_id: insumo.id,
			nuevo_insumo: undefined,
			producto_id: '',
			descripcion: insumo.nombre,
			unidad: insumo.unidad,
			precio_unitario: insumo.costo_unitario,
			costo_materiales: insumo.costo_unitario,
			precio_lista_unitario: insumo.costo_unitario,
			precio_minimo_unitario: insumo.costo_unitario
		});
	}

	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLElement) {
				const tag = event.target.tagName;
				if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
			}
			const key = event.key.toUpperCase();
			const atajo = atajosAgregar.find((item) => item.key === key);
			if (!atajo || bloqueada) return;
			event.preventDefault();
			atajo.action();
		};
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	function abrirNuevoInsumo() {
		if (bloqueada) return;
		nuevoInsumoAbierto = true;
	}

	function agregarNuevoInsumo(nuevo: NonNullable<LineaEdicion['nuevo_insumo']>) {
		const linea = {
			...lineaVacia('insumo', siguienteId++),
			nuevo_insumo: nuevo,
			descripcion: nuevo.nombre,
			unidad: nuevo.unidad,
			precio_unitario: nuevo.costo_unitario,
			precio_lista_unitario: nuevo.costo_unitario,
			precio_minimo_unitario: nuevo.costo_unitario,
			costo_materiales: nuevo.costo_unitario
		};
		lineas = [...lineas, linea];
	}

	function actualizarPrecioTotal(valor: string) {
		precioTotalIngresado = valor;
		ajusteManual = redondearPrecio((Number(valor) || 0) - totalCalculado);
	}

	function finalizarEdicionPrecioTotal() {
		precioTotalIngresado = null;
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
					costo_materiales: Number(linea.costo_materiales) || 0
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

<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
	<legend class="fieldset-legend">Líneas de cotización</legend>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn btn-outline btn-primary btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('producto')}
			>
				<span>Producto</span>
				<kbd class="kbd kbd-xs">F1</kbd>
			</button>
			<button
				type="button"
				class="btn btn-outline btn-secondary btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('insumo')}
			>
				<span>Insumo</span>
				<kbd class="kbd kbd-xs">F2</kbd>
			</button>
			<button
				type="button"
				class="btn btn-outline btn-accent btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('concepto')}
			>
				<span>Concepto</span>
				<kbd class="kbd kbd-xs">F3</kbd>
			</button>
			<Can modulo="insumos" accion="create">
				<button
					type="button"
					class="btn btn-outline btn-sm"
					disabled={bloqueada}
					onclick={abrirNuevoInsumo}
				>
					<span>Insumo nuevo</span>
					<kbd class="kbd kbd-xs">F4</kbd>
				</button>
			</Can>
		</div>

		<CotizacionLineasTabla
			{lineas}
			{bloqueada}
			{productos}
			{insumos}
			{descuentoGlobal}
			{totalBase}
			{importeDescuento}
			{incluirIva}
			{importeIva}
			onEliminar={eliminarLinea}
			onSeleccionarProducto={seleccionarProducto}
			onSeleccionarInsumo={seleccionarInsumo}
			onActualizarCantidad={(lineaId, cantidad) => actualizarLinea(lineaId, { cantidad })}
			onActualizarDescripcion={(lineaId, descripcion) => actualizarLinea(lineaId, { descripcion })}
			onActualizarPrecio={actualizarPrecioUnitario}
			onCambiarVisibilidad={cambiarVisibilidad}
			onActualizarCostoInterno={(lineaId, costo) =>
				actualizarLinea(lineaId, { costo_materiales: Math.max(costo, 0) })}
		/>

		<CotizacionTotales
			{bloqueada}
			{guardando}
			{validezDias}
			{incluirIva}
			{descuentoGlobal}
			{totalCalculado}
			{totalFinal}
			{precioTotalIngresado}
			{condicionesPago}
			onCambiarValidez={(dias) => (validezDias = dias)}
			onCambiarIva={(incluir) => (incluirIva = incluir)}
			onCambiarDescuento={(porcentaje) => (descuentoGlobal = porcentaje)}
			onActualizarTotal={actualizarPrecioTotal}
			onFinalizarEdicionTotal={finalizarEdicionPrecioTotal}
			onCambiarCondiciones={(condiciones) => (condicionesPago = condiciones)}
			onGuardar={guardarCotizacion}
		/>
	</div>
</fieldset>

<CotizacionNuevoInsumoDialog
	bind:open={nuevoInsumoAbierto}
	tipos={tiposInsumo}
	categorias={categoriasInsumo}
	unidades={unidadesInsumo}
	onAgregar={agregarNuevoInsumo}
/>
