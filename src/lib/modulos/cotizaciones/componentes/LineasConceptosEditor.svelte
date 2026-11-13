<script lang="ts">
	import { page } from '$app/state';
	import { onMount, type Snippet } from 'svelte';
	import CotizacionLineasTabla from '$lib/modulos/cotizaciones/componentes/CotizacionLineasTabla.svelte';
	import CotizacionNuevoInsumoDialog from '$lib/modulos/cotizaciones/componentes/CotizacionNuevoInsumoDialog.svelte';
	import { Can, Seccion } from '$lib/ui';
	import { getProductoConReceta, getProductoPrecio } from '$lib/modulos/productos/productos.remote';
	import type {
		InsumoOpcion,
		LineaEdicion,
		MaterialSnapshot,
		ProductoOpcion
	} from '$lib/modulos/cotizaciones/tipos';
	import type { StockDisponibilidad } from '$lib/modulos/stock/tipos';
	import type { Moneda } from '$lib/utils/moneda';
	import { can } from '$lib/utils/permissions';
	import { toast } from '$lib/ui/toast.svelte';
	import {
		ajustarPrecioPorCambioDeCosto,
		calcularCostoComposicion,
		normalizarPrecioPendiente,
		parsearNumeroDecimal,
		redondearPrecio
	} from '$lib/utils/precios';

	type Props = {
		lineas: LineaEdicion[];
		productos: ProductoOpcion[];
		onBuscarProducto?: (search: string) => Promise<void>;
		stockDisponibilidad?: StockDisponibilidad[];
		insumos: InsumoOpcion[];
		tiposInsumo: { id: number; nombre: string }[];
		categoriasInsumo: { id: number; nombre: string }[];
		unidadesInsumo: { id: number; nombre: string }[];
		bloqueada: boolean;
		moneda?: Moneda;
		factor?: number;
		contexto?: string;
		descuentoGlobal: number;
		totalBase: number;
		importeDescuento: number;
		incluirIva: boolean;
		importeIva: number;
		onChange?: (lineas: LineaEdicion[]) => void;
		pie?: Snippet;
	};

	let {
		lineas = $bindable(),
		productos,
		onBuscarProducto,
		stockDisponibilidad = [],
		insumos,
		tiposInsumo,
		categoriasInsumo,
		unidadesInsumo,
		bloqueada,
		moneda = 'USD',
		factor = 1,
		contexto = 'cotización',
		descuentoGlobal,
		totalBase,
		importeDescuento,
		incluirIva,
		importeIva,
		onChange,
		pie
	}: Props = $props();

	let siguienteId = $state(Date.now());
	let solicitudProducto = 0;
	let nuevoInsumoAbierto = $state(false);
	let puedeCrearInsumo = $derived(can(page.data.user, page.data.permisos, 'insumos', 'create'));
	const atajosAgregar = [
		{ key: 'p', action: () => agregarLinea('producto') },
		{ key: 'i', action: () => agregarLinea('insumo') },
		{ key: 'c', action: () => agregarLinea('concepto') },
		{ key: 'n', action: abrirNuevoInsumo }
	] as const;

	const enMoneda = (valorUsd: number | null | undefined) =>
		redondearPrecio((valorUsd ?? 0) * factor);

	function guardarLineas(nuevasLineas: LineaEdicion[]) {
		lineas = nuevasLineas;
		onChange?.(nuevasLineas);
	}

	function lineaVacia(tipo: LineaEdicion['tipo'], idx: number): LineaEdicion {
		return {
			idx,
			tipo,
			visible_cliente: tipo !== 'insumo',
			producto_id: '',
			stock_ubicacion_id: '',
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
		guardarLineas([...lineas, lineaVacia(tipo, siguienteId++)]);
	}

	function actualizarLinea(lineaId: number, cambios: Partial<LineaEdicion>) {
		guardarLineas(
			lineas.map((linea) => (linea.idx === lineaId ? { ...linea, ...cambios } : linea))
		);
	}

	function limpiarLinea(lineaId: number, tipo: LineaEdicion['tipo']) {
		actualizarLinea(lineaId, lineaVacia(tipo, lineaId));
	}

	async function seleccionarProducto(lineaId: number, productoId: string) {
		const solicitud = ++solicitudProducto;
		if (!productoId) {
			limpiarLinea(lineaId, 'producto');
			return;
		}
		const producto = productos.find((item) => item.id === Number(productoId));
		if (!producto) return;

		let snapshot: MaterialSnapshot[] = [];
		let precioProducto = {
			costo_materiales: producto.costo_materiales ?? 0,
			precio_venta: producto.precio_venta ?? 0
		};
		const [recetaResultado, precioResultado] = await Promise.allSettled([
			getProductoConReceta(Number(productoId)),
			getProductoPrecio(Number(productoId))
		]);
		if (solicitud !== solicitudProducto) return;
		if (precioResultado.status === 'rejected') {
			toast.error('No se pudo calcular el precio del producto seleccionado');
			limpiarLinea(lineaId, 'producto');
			return;
		}
		precioProducto = precioResultado.value;
		if (recetaResultado.status === 'fulfilled') {
			const receta = recetaResultado.value;
			snapshot = receta.recetaDirecta.map((material) => {
				if (material.insumo_id) {
					const detalle = receta.receta.find((item) => item.insumo_id === material.insumo_id);
					const costo = enMoneda(detalle?.costo_unitario);
					return {
						insumo_id: material.insumo_id,
						codigo: detalle?.codigo ?? null,
						nombre: detalle?.nombre ?? 'Insumo',
						cantidad: material.cantidad,
						costo_unitario: costo,
						unidad: detalle?.unidad ?? '',
						subtotal: redondearPrecio(material.cantidad * costo)
					};
				}
				const nombre =
					receta.componentes.find((item) => item.componente_id === material.producto_id)?.nombre ??
					'Componente';
				return {
					producto_id: material.producto_id ?? null,
					nombre: `${nombre} (${material.cantidad}x)`,
					cantidad: material.cantidad,
					unidad: 'subproducto',
					costo_unitario: 0,
					subtotal: 0
				};
			});
		}

		actualizarLinea(lineaId, {
			tipo: 'producto',
			visible_cliente: true,
			producto_id: productoId,
			stock_ubicacion_id: '',
			insumo_id: undefined,
			nuevo_insumo: undefined,
			unidad: '',
			descripcion: producto.nombre,
			costo_materiales: enMoneda(precioProducto.costo_materiales),
			precio_lista_unitario: enMoneda(precioProducto.precio_venta),
			precio_minimo_unitario: enMoneda(precioProducto.precio_venta),
			precio_unitario: enMoneda(precioProducto.precio_venta),
			insumos_snapshot: snapshot
		});
	}

	function seleccionarInsumo(lineaId: number, insumoId: string) {
		const insumo = insumos.find((item) => item.id === Number(insumoId));
		if (!insumo) {
			limpiarLinea(lineaId, 'insumo');
			return;
		}
		actualizarLinea(lineaId, {
			tipo: 'insumo',
			visible_cliente: false,
			producto_id: '',
			insumo_id: insumo.id,
			nuevo_insumo: undefined,
			descripcion: insumo.nombre,
			unidad: insumo.unidad,
			precio_unitario: enMoneda(insumo.costo_unitario),
			precio_lista_unitario: enMoneda(insumo.costo_unitario),
			precio_minimo_unitario: enMoneda(insumo.costo_unitario),
			costo_materiales: enMoneda(insumo.costo_unitario),
			insumos_snapshot: [
				{
					insumo_id: insumo.id,
					codigo: insumo.codigo,
					nombre: insumo.nombre,
					cantidad: 1,
					unidad: insumo.unidad,
					costo_unitario: enMoneda(insumo.costo_unitario),
					subtotal: enMoneda(insumo.costo_unitario)
				}
			]
		});
	}

	function actualizarPrecioLinea(lineaId: number, valor: string) {
		const ingresado = parsearNumeroDecimal(valor);
		const linea = lineas.find((item) => item.idx === lineaId);
		if (!linea) return;
		const precioBase = normalizarPrecioPendiente(
			ingresado ?? valor,
			linea.tipo === 'concepto' ? 0 : linea.precio_minimo_unitario
		);
		const precio = redondearPrecio(
			Math.max(precioBase, linea.tipo === 'concepto' ? 0 : linea.precio_minimo_unitario)
		);
		actualizarLinea(lineaId, { precio_lista_unitario: precio, precio_unitario: precio });
	}

	function agregarInsumoAsociado(lineaId: number, insumoId: number, cantidad: number) {
		const insumo = insumos.find((item) => item.id === insumoId);
		const linea = lineas.find((item) => item.idx === lineaId);
		if (!insumo || linea?.tipo !== 'concepto') return;
		if (linea.insumos_snapshot.some((material) => material.insumo_id === insumoId)) return;

		const snapshot = [
			...linea.insumos_snapshot,
			{
				insumo_id: insumo.id,
				codigo: insumo.codigo,
				nombre: insumo.nombre,
				cantidad,
				unidad: insumo.unidad,
				costo_unitario: enMoneda(insumo.costo_unitario),
				subtotal: redondearPrecio(cantidad * enMoneda(insumo.costo_unitario))
			}
		];
		const costoNuevo = calcularCostoComposicion(snapshot);
		const precio = ajustarPrecioPorCambioDeCosto(
			linea.precio_lista_unitario,
			calcularCostoComposicion(linea.insumos_snapshot),
			costoNuevo
		);
		actualizarLinea(lineaId, {
			insumos_snapshot: snapshot,
			costo_materiales: costoNuevo,
			precio_lista_unitario: precio,
			precio_unitario: precio
		});
	}

	function quitarInsumoAsociado(lineaId: number, indice: number) {
		const linea = lineas.find((item) => item.idx === lineaId);
		if (linea?.tipo !== 'concepto') return;

		const snapshot = linea.insumos_snapshot.filter((_, index) => index !== indice);
		const precio = ajustarPrecioPorCambioDeCosto(
			linea.precio_lista_unitario,
			calcularCostoComposicion(linea.insumos_snapshot),
			calcularCostoComposicion(snapshot)
		);
		actualizarLinea(lineaId, {
			insumos_snapshot: snapshot,
			costo_materiales: calcularCostoComposicion(snapshot),
			precio_lista_unitario: precio,
			precio_unitario: precio
		});
	}

	function eliminarLinea(lineaId: number) {
		const linea = lineas.find((item) => item.idx === lineaId);
		if (lineas.length > 1 && !linea?.bloqueo) {
			guardarLineas(lineas.filter((item) => item.idx !== lineaId));
		}
	}

	function abrirNuevoInsumo() {
		if (!bloqueada && puedeCrearInsumo) nuevoInsumoAbierto = true;
	}

	function agregarNuevoInsumo(nuevo: NonNullable<LineaEdicion['nuevo_insumo']>) {
		guardarLineas([
			...lineas,
			{
				...lineaVacia('insumo', siguienteId++),
				nuevo_insumo: nuevo,
				descripcion: nuevo.nombre,
				unidad: nuevo.unidad,
				precio_unitario: redondearPrecio(nuevo.costo_unitario),
				precio_lista_unitario: redondearPrecio(nuevo.costo_unitario),
				precio_minimo_unitario: redondearPrecio(nuevo.costo_unitario),
				costo_materiales: redondearPrecio(nuevo.costo_unitario)
			}
		]);
	}

	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (
				event.target instanceof HTMLElement &&
				['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
			) {
				return;
			}
			if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
			const atajo = atajosAgregar.find((item) => item.key === event.key.toLowerCase());
			if (!atajo || bloqueada) return;
			event.preventDefault();
			atajo.action();
		};
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<Seccion titulo={contexto === 'pedido' ? 'Conceptos del pedido' : 'Líneas de cotización'}>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn btn-outline btn-primary btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('producto')}
			>
				<span>Producto</span><kbd class="kbd kbd-xs">Alt+Shift+P</kbd>
			</button>
			<button
				type="button"
				class="btn btn-outline btn-secondary btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('insumo')}
			>
				<span>Insumo</span><kbd class="kbd kbd-xs">Alt+Shift+I</kbd>
			</button>
			<button
				type="button"
				class="btn btn-outline btn-accent btn-sm"
				disabled={bloqueada}
				onclick={() => agregarLinea('concepto')}
			>
				<span>Concepto</span><kbd class="kbd kbd-xs">Alt+Shift+C</kbd>
			</button>
			<Can modulo="insumos" accion="create">
				<button
					type="button"
					class="btn btn-outline btn-sm"
					disabled={bloqueada}
					onclick={abrirNuevoInsumo}
				>
					<span>Insumo nuevo</span><kbd class="kbd kbd-xs">Alt+Shift+N</kbd>
				</button>
			</Can>
		</div>
		<CotizacionLineasTabla
			{lineas}
			{bloqueada}
			{moneda}
			{productos}
			{onBuscarProducto}
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
			onActualizarPrecio={actualizarPrecioLinea}
			onCambiarVisibilidad={(lineaId, visible) =>
				actualizarLinea(lineaId, { visible_cliente: visible })}
			onActualizarCostoInterno={(lineaId, costo) =>
				actualizarLinea(lineaId, { costo_materiales: Math.max(redondearPrecio(costo), 0) })}
		/>
		{#if contexto === 'pedido'}
			{@const lineasConStock = lineas.filter(
				(linea) =>
					linea.tipo === 'producto' &&
					stockDisponibilidad.some(
						(stock) => stock.producto_id === Number(linea.producto_id) && stock.disponible > 0
					)
			)}
			{#if lineasConStock.length}
				<fieldset class="fieldset seccion">
					<legend class="fieldset-legend">Origen de productos</legend>
					<div class="flex flex-col gap-3">
						{#each lineasConStock as linea (linea.idx)}
							{@const ubicaciones = stockDisponibilidad.filter(
								(stock) => stock.producto_id === Number(linea.producto_id) && stock.disponible > 0
							)}
							<div
								class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,1fr)] sm:items-center"
							>
								<span class="text-sm font-medium">{linea.descripcion} · {linea.cantidad} u.</span>
								<select
									class="select select-sm"
									value={linea.stock_ubicacion_id ?? ''}
									disabled={bloqueada}
									onchange={(event) =>
										actualizarLinea(linea.idx, {
											stock_ubicacion_id: event.currentTarget.value
										})}
								>
									<option value="">Fabricar (flujo habitual)</option>
									{#each ubicaciones as ubicacion (`${linea.idx}-${ubicacion.ubicacion_id}`)}
										<option
											value={String(ubicacion.ubicacion_id)}
											disabled={ubicacion.disponible < linea.cantidad}
										>
											{ubicacion.ubicacion_nombre} · {ubicacion.disponible} disponibles
										</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
				</fieldset>
			{/if}
		{/if}
	</div>
	{@render pie?.()}
</Seccion>

<CotizacionNuevoInsumoDialog
	bind:open={nuevoInsumoAbierto}
	{contexto}
	tipos={tiposInsumo}
	categorias={categoriasInsumo}
	unidades={unidadesInsumo}
	onAgregar={agregarNuevoInsumo}
/>
