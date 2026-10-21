<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import CotizacionLineasTabla from '$lib/components/cotizaciones/CotizacionLineasTabla.svelte';
	import CotizacionNuevoInsumoDialog from '$lib/components/cotizaciones/CotizacionNuevoInsumoDialog.svelte';
	import CotizacionTotales from '$lib/components/cotizaciones/CotizacionTotales.svelte';
	import { cotizarCotizacion } from '$lib/remote/cotizaciones.remote';
	import { getProductoConReceta } from '$lib/remote/productos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		ajustarPrecioPorCambioDeCosto,
		calcularCostoComposicion,
		calcularIva21,
		formatearDosDecimales,
		parsearNumeroDecimal,
		precioNetoCubreCosto,
		redondearPrecio
	} from '$lib/utils/precios';
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
	let siguienteId = $state(Date.now());
	let nuevoInsumoAbierto = $state(false);
	const atajosAgregar = [
		{ key: 'p', action: () => agregarLinea('producto') },
		{ key: 'i', action: () => agregarLinea('insumo') },
		{ key: 'c', action: () => agregarLinea('concepto') },
		{ key: 'n', action: abrirNuevoInsumo }
	] as const;

	let lineas = $derived.by<LineaEdicion[]>(() =>
		lineasIniciales.map((linea) => {
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
		})
	);
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
		precioTotalIngresado = null;
		lineas = [...lineas, lineaVacia(tipo, siguienteId++)];
	}

	function actualizarLinea(lineaId: number, cambios: Partial<LineaEdicion>) {
		precioTotalIngresado = null;
		lineas = lineas.map((linea) => (linea.idx === lineaId ? { ...linea, ...cambios } : linea));
	}

	function cambiarVisibilidad(lineaId: number, visible: boolean) {
		actualizarLinea(lineaId, { visible_cliente: visible });
	}

	function actualizarPrecioUnitario(lineaId: number, valor: string) {
		const precioIngresado = parsearNumeroDecimal(valor);
		if (precioIngresado === null) return;
		precioTotalIngresado = null;

		lineas = lineas.map((linea) => {
			if (linea.idx !== lineaId) return linea;
			const precioLista = redondearPrecio(
				linea.tipo === 'concepto'
					? Math.max(precioIngresado, 0)
					: Math.max(precioIngresado, linea.precio_minimo_unitario)
			);
			return {
				...linea,
				precio_lista_unitario: precioLista,
				precio_unitario: precioLista
			};
		});
	}

	function agregarInsumoAsociado(lineaId: number, insumoId: number, cantidad: number) {
		const insumo = insumos.find((item) => item.id === insumoId);
		const linea = lineas.find((item) => item.idx === lineaId);
		if (!insumo || linea?.tipo !== 'concepto') return;
		if (linea.insumos_snapshot.some((material) => material.insumo_id === insumoId)) return;

		const insumos_snapshot = [
			...linea.insumos_snapshot,
			{
				insumo_id: insumo.id,
				codigo: insumo.codigo,
				nombre: insumo.nombre,
				cantidad,
				costo_unitario: insumo.costo_unitario,
				unidad: insumo.unidad,
				subtotal: cantidad * insumo.costo_unitario
			}
		];
		const costoAnterior = calcularCostoComposicion(linea.insumos_snapshot);
		const costoNuevo = calcularCostoComposicion(insumos_snapshot);
		const precioUnitario = ajustarPrecioPorCambioDeCosto(
			linea.precio_lista_unitario,
			costoAnterior,
			costoNuevo
		);
		actualizarLinea(lineaId, {
			insumos_snapshot,
			costo_materiales: costoNuevo,
			precio_lista_unitario: precioUnitario,
			precio_unitario: precioUnitario
		});
	}

	function quitarInsumoAsociado(lineaId: number, indice: number) {
		const linea = lineas.find((item) => item.idx === lineaId);
		if (linea?.tipo !== 'concepto') return;

		const insumos_snapshot = linea.insumos_snapshot.filter((_, index) => index !== indice);
		const costoAnterior = calcularCostoComposicion(linea.insumos_snapshot);
		const costoNuevo = calcularCostoComposicion(insumos_snapshot);
		const precioUnitario = ajustarPrecioPorCambioDeCosto(
			linea.precio_lista_unitario,
			costoAnterior,
			costoNuevo
		);
		actualizarLinea(lineaId, {
			insumos_snapshot,
			costo_materiales: costoNuevo,
			precio_lista_unitario: precioUnitario,
			precio_unitario: precioUnitario
		});
	}

	function eliminarLinea(lineaId: number) {
		if (lineas.length > 1) {
			precioTotalIngresado = null;
			lineas = lineas.filter((linea) => linea.idx !== lineaId);
		}
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
			costo_materiales: redondearPrecio(producto.costo_materiales ?? 0),
			precio_lista_unitario: redondearPrecio(producto.precio_venta),
			precio_minimo_unitario: redondearPrecio(producto.precio_venta),
			precio_unitario: redondearPrecio(producto.precio_venta),
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
			precio_unitario: redondearPrecio(insumo.costo_unitario),
			costo_materiales: redondearPrecio(insumo.costo_unitario),
			precio_lista_unitario: redondearPrecio(insumo.costo_unitario),
			precio_minimo_unitario: redondearPrecio(insumo.costo_unitario)
		});
	}

	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLElement) {
				const tag = event.target.tagName;
				if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
			}
			if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
			const key = event.key.toLowerCase();
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
		precioTotalIngresado = null;
		const linea = {
			...lineaVacia('insumo', siguienteId++),
			nuevo_insumo: nuevo,
			descripcion: nuevo.nombre,
			unidad: nuevo.unidad,
			precio_unitario: redondearPrecio(nuevo.costo_unitario),
			precio_lista_unitario: redondearPrecio(nuevo.costo_unitario),
			precio_minimo_unitario: redondearPrecio(nuevo.costo_unitario),
			costo_materiales: redondearPrecio(nuevo.costo_unitario)
		};
		lineas = [...lineas, linea];
	}

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
				<kbd class="kbd kbd-xs">Alt+Shift+P</kbd>
			</button>
			<button
				type="button"
				class="btn btn-outline btn-secondary btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('insumo')}
			>
				<span>Insumo</span>
				<kbd class="kbd kbd-xs">Alt+Shift+I</kbd>
			</button>
			<button
				type="button"
				class="btn btn-outline btn-accent btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('concepto')}
			>
				<span>Concepto</span>
				<kbd class="kbd kbd-xs">Alt+Shift+C</kbd>
			</button>
			<Can modulo="insumos" accion="create">
				<button
					type="button"
					class="btn btn-outline btn-sm"
					disabled={bloqueada}
					onclick={abrirNuevoInsumo}
				>
					<span>Insumo nuevo</span>
					<kbd class="kbd kbd-xs">Alt+Shift+N</kbd>
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
			onAgregarInsumoAsociado={agregarInsumoAsociado}
			onQuitarInsumoAsociado={quitarInsumoAsociado}
			onEliminar={eliminarLinea}
			onSeleccionarProducto={seleccionarProducto}
			onSeleccionarInsumo={seleccionarInsumo}
			onActualizarCantidad={(lineaId, cantidad) => actualizarLinea(lineaId, { cantidad })}
			onActualizarDescripcion={(lineaId, descripcion) => actualizarLinea(lineaId, { descripcion })}
			onActualizarPrecio={actualizarPrecioUnitario}
			onCambiarVisibilidad={cambiarVisibilidad}
			onActualizarCostoInterno={(lineaId, costo) =>
				actualizarLinea(lineaId, { costo_materiales: Math.max(redondearPrecio(costo), 0) })}
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
	</div>
</fieldset>

<CotizacionNuevoInsumoDialog
	bind:open={nuevoInsumoAbierto}
	tipos={tiposInsumo}
	categorias={categoriasInsumo}
	unidades={unidadesInsumo}
	onAgregar={agregarNuevoInsumo}
/>
