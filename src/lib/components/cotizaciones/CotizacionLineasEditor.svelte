<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import CotizacionLineaFila from '$lib/components/cotizaciones/CotizacionLineaFila.svelte';
	import { cotizarCotizacion } from '$lib/remote/cotizaciones.remote';
	import { getProductoConReceta } from '$lib/remote/productos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { calcularIva21, redondearPrecio } from '$lib/utils/precios';
	import type {
		InsumoOpcion,
		LineaEdicion,
		LineaInicial,
		MaterialSnapshot,
		ProductoOpcion
	} from '$lib/types/cotizacion-editor';

	type Props = {
		cotizacionId: number;
		bloqueada: boolean;
		validezInicial: number;
		precioTotalInicial: number | null;
		incluirIvaInicial: boolean;
		condicionesPagoInicial: string | null;
		lineasIniciales: LineaInicial[];
		productos: ProductoOpcion[];
		insumos: InsumoOpcion[];
	};

	let {
		cotizacionId,
		bloqueada,
		validezInicial,
		precioTotalInicial,
		incluirIvaInicial,
		condicionesPagoInicial,
		lineasIniciales,
		productos,
		insumos
	}: Props = $props();
	const totalBaseInicial = untrack(() =>
		Number(
			lineasIniciales
				.filter((linea) => linea.producto_id || !linea.insumo_id)
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
				.toFixed(2)
		)
	);
	const totalInicialCalculado = untrack(() =>
		redondearPrecio(totalBaseInicial + (incluirIvaInicial ? calcularIva21(totalBaseInicial) : 0))
	);
	const ajusteManualInicial = untrack(() =>
		precioTotalInicial === null ? 0 : redondearPrecio(precioTotalInicial - totalInicialCalculado)
	);
	let incluirIva = $state(untrack(() => incluirIvaInicial));
	let condicionesPago = $state(
		untrack(() => condicionesPagoInicial ?? '50% de anticipo al aprobar, saldo contra entrega.')
	);
	let validezDias = $derived(validezInicial);
	let guardando = $state(false);
	let siguienteId = $state(Date.now());

	let lineas = $derived.by<LineaEdicion[]>(() =>
		lineasIniciales.map((linea) => {
			const producto = productos.find((item) => item.id === linea.producto_id);
			const insumo = insumos.find((item) => item.id === linea.insumo_id);
			const precioMinimo = producto?.precio_venta ?? insumo?.costo_unitario ?? 0;

			return {
				idx: linea.id,
				tipo: linea.producto_id ? 'producto' : linea.insumo_id ? 'insumo' : 'personalizado',
				producto_id: linea.producto_id ? String(linea.producto_id) : '',
				insumo_id: linea.insumo_id ?? undefined,
				unidad: linea.insumo_unidad ?? '',
				insumos_snapshot: Array.isArray(linea.insumos_snapshot)
					? (linea.insumos_snapshot as MaterialSnapshot[])
					: [],
				descripcion: linea.descripcion,
				cantidad: linea.cantidad,
				precio_unitario: linea.precio_unitario,
				precio_lista_unitario: Math.max(linea.precio_lista_unitario, precioMinimo),
				precio_minimo_unitario: precioMinimo,
				margen_porcentaje: linea.margen_porcentaje ?? 0,
				descuento_porcentaje: linea.descuento_porcentaje ?? 0,
				justificacion_descuento: linea.justificacion_descuento ?? '',
				costo_mano_obra: linea.costo_mano_obra ?? 0,
				costo_materiales: linea.costo_materiales ?? 0
			};
		})
	);

	let totalBase = $derived(
		Number(
			lineas
				.filter((linea) => linea.tipo !== 'insumo')
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
				.toFixed(2)
		)
	);
	let importeIva = $derived(incluirIva ? calcularIva21(totalBase) : 0);
	let totalCalculado = $derived(redondearPrecio(totalBase + importeIva));
	let precioTotalIngresado = $state<string | null>(null);
	let precioTotalEditado = $state(false);
	let ajusteManualIngresado = $state(0);
	let ajusteManual = $derived(precioTotalEditado ? ajusteManualIngresado : ajusteManualInicial);
	let totalFinal = $derived(redondearPrecio(totalCalculado + ajusteManual));

	function lineaVacia(tipo: LineaEdicion['tipo'], idx: number): LineaEdicion {
		return {
			idx,
			tipo,
			producto_id: '',
			insumo_id: undefined,
			unidad: '',
			insumos_snapshot: [],
			descripcion: '',
			cantidad: 1,
			precio_unitario: 0,
			precio_lista_unitario: 0,
			precio_minimo_unitario: 0,
			margen_porcentaje: 0,
			descuento_porcentaje: 0,
			justificacion_descuento: '',
			costo_mano_obra: 0,
			costo_materiales: 0
		};
	}

	function agregarLinea(tipo: LineaEdicion['tipo']) {
		lineas = [...lineas, lineaVacia(tipo, siguienteId++)];
	}

	function actualizarLinea(lineaId: number, cambios: Partial<LineaEdicion>) {
		lineas = lineas.map((linea) => (linea.idx === lineaId ? { ...linea, ...cambios } : linea));
	}

	function actualizarDescuento(
		lineaId: number,
		campo: 'porcentaje' | 'justificacion',
		valor: string
	) {
		lineas = lineas.map((linea) => {
			if (linea.idx !== lineaId) return linea;
			const descuento =
				campo === 'porcentaje'
					? Math.min(Math.max(Number(valor) || 0, 0), 99.99)
					: linea.descuento_porcentaje;
			const justificacion =
				descuento === 0 ? '' : campo === 'justificacion' ? valor : linea.justificacion_descuento;

			return {
				...linea,
				descuento_porcentaje: descuento,
				justificacion_descuento: justificacion,
				precio_unitario: redondearPrecio(linea.precio_lista_unitario * (1 - descuento / 100))
			};
		});
	}

	function actualizarPrecioUnitario(lineaId: number, valor: string) {
		lineas = lineas.map((linea) => {
			if (linea.idx !== lineaId) return linea;
			const precioLista = Math.max(Number(valor) || 0, linea.precio_minimo_unitario);
			return {
				...linea,
				precio_lista_unitario: precioLista,
				precio_unitario: redondearPrecio(precioLista * (1 - linea.descuento_porcentaje / 100))
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

		try {
			const { producto, receta, recetaDirecta, componentes } = await getProductoConReceta(
				Number(productoId)
			);
			const snapshot: MaterialSnapshot[] = recetaDirecta.map((linea) => {
				if (linea.insumo_id) {
					const material = receta.find((item) => item.insumo_id === linea.insumo_id);
					const insumo = insumos.find((item) => item.id === linea.insumo_id);
					const nombre = material?.nombre ?? insumo?.nombre ?? 'Insumo';
					const costo = material?.costo_unitario ?? insumo?.costo_unitario ?? 0;
					return {
						insumo_id: linea.insumo_id,
						codigo: material?.codigo ?? insumo?.codigo ?? null,
						nombre,
						cantidad: linea.cantidad,
						costo_unitario: Number((costo ?? 0).toFixed(2)),
						unidad: material?.unidad ?? insumo?.unidad ?? '',
						subtotal: Number(((linea.cantidad || 0) * (costo ?? 0)).toFixed(2))
					};
				}

				const nombre =
					componentes.find((componente) => componente.componente_id === linea.producto_id)
						?.nombre ??
					productos.find((item) => item.id === linea.producto_id)?.nombre ??
					'Componente';
				return {
					producto_id: linea.producto_id ?? null,
					nombre: `${nombre} (${linea.cantidad}x)`,
					cantidad: linea.cantidad,
					unidad: 'subproducto',
					costo_unitario: 0,
					subtotal: 0
				};
			});

			actualizarLinea(lineaId, {
				tipo: 'producto',
				producto_id: productoId,
				insumo_id: undefined,
				unidad: '',
				descripcion: producto.nombre,
				costo_materiales: producto.costo_materiales ?? 0,
				margen_porcentaje: producto.margen_porcentaje ?? 0,
				descuento_porcentaje: 0,
				justificacion_descuento: '',
				precio_lista_unitario: producto.precio_venta,
				precio_minimo_unitario: producto.precio_venta,
				precio_unitario: producto.precio_venta,
				insumos_snapshot: snapshot
			});
		} catch {
			toast.error('No se pudo cargar la receta del producto');
		}
	}

	function seleccionarInsumo(lineaId: number, valor: string) {
		const insumo = insumos.find((item) => item.id === Number(valor));
		if (!insumo) {
			limpiarLinea(lineaId, 'insumo');
			return;
		}

		actualizarLinea(lineaId, {
			tipo: 'insumo',
			insumo_id: insumo.id,
			producto_id: '',
			descripcion: insumo.nombre,
			unidad: insumo.unidad,
			precio_unitario: insumo.costo_unitario,
			costo_materiales: insumo.costo_unitario,
			precio_lista_unitario: insumo.costo_unitario,
			precio_minimo_unitario: insumo.costo_unitario,
			margen_porcentaje: 0,
			descuento_porcentaje: 0,
			justificacion_descuento: '',
			insumos_snapshot: [
				{
					insumo_id: insumo.id,
					codigo: insumo.codigo,
					nombre: insumo.nombre,
					cantidad: 1,
					costo_unitario: insumo.costo_unitario,
					unidad: insumo.unidad,
					subtotal: insumo.costo_unitario
				}
			]
		});
	}

	async function guardarCotizacion() {
		guardando = true;
		try {
			await cotizarCotizacion({
				cotizacion_id: cotizacionId,
				validez_dias: Number(validezDias) || 15,
				precio_total: totalFinal,
				incluir_iva: incluirIva,
				condiciones_pago: condicionesPago.trim(),
				lineas: lineas.map((linea) => ({
					producto_id: linea.producto_id || undefined,
					insumo_id: linea.insumo_id ? Number(linea.insumo_id) : undefined,
					es_personalizado: linea.tipo === 'personalizado',
					descripcion: linea.descripcion || '',
					cantidad: Number(linea.cantidad) || 1,
					precio_unitario: Number(linea.precio_unitario) || 0,
					precio_lista_unitario: Number(linea.precio_lista_unitario) || 0,
					descuento_porcentaje: Number(linea.descuento_porcentaje) || 0,
					justificacion_descuento: linea.justificacion_descuento || undefined,
					costo_mano_obra: Number(linea.costo_mano_obra) || 0,
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

{#if incluirIva}
	<tr>
		<td colspan="4" class="text-right font-semibold">IVA (21%)</td>
		<td class="text-right font-semibold">
			${importeIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
		</td>
		<td></td>
	</tr>
{/if}

<section class="card bg-base-100 shadow">
	<div class="card-body gap-4">
		<label class="fieldset w-full">
			<span class="fieldset-legend">Condiciones de pago</span>
			<textarea
				class="textarea w-full"
				rows="2"
				maxlength="1000"
				disabled={bloqueada}
				bind:value={condicionesPago}
				placeholder="Transferencia, tarjeta de crédito en cuotas, anticipo y saldo..."
			></textarea>
		</label>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="card-title">Líneas de la cotización</h2>
				{#if bloqueada}<p class="text-sm text-base-content/60">
						Cotización convertida: precios bloqueados.
					</p>{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="btn btn-outline btn-sm"
					disabled={bloqueada}
					onclick={() => agregarLinea('producto')}
				>
					+ Producto
				</button>
				<button
					type="button"
					class="btn btn-outline btn-sm"
					disabled={bloqueada}
					onclick={() => agregarLinea('insumo')}
				>
					+ Insumo interno
				</button>
				<button
					type="button"
					class="btn btn-outline btn-sm"
					disabled={bloqueada}
					onclick={() => agregarLinea('personalizado')}
				>
					+ Concepto
				</button>
			</div>
		</div>

		<div class="overflow-visible rounded-box border border-base-300">
			<table class="table min-w-232 table-sm">
				<thead>
					<tr>
						<th>Artículo / concepto</th>
						<th class="w-28 text-right">Cantidad</th>
						<th class="w-40 text-right">Precio / costo unitario</th>
						<th class="w-24 text-right">Desc. %</th>
						<th class="w-40 text-right">Subtotal</th>
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
							onEliminar={eliminarLinea}
							onSeleccionarProducto={seleccionarProducto}
							onSeleccionarInsumo={seleccionarInsumo}
							onActualizarCantidad={(lineaId, cantidad) => actualizarLinea(lineaId, { cantidad })}
							onActualizarDescripcion={(lineaId, descripcion) =>
								actualizarLinea(lineaId, { descripcion })}
							onActualizarPrecio={actualizarPrecioUnitario}
							onActualizarDescuento={(lineaId, descuento) =>
								actualizarDescuento(lineaId, 'porcentaje', descuento)}
							onActualizarMotivo={(lineaId, motivo) =>
								actualizarDescuento(lineaId, 'justificacion', motivo)}
						/>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-4">
			<label class="flex items-center gap-2 text-sm">
				Validez (días)
				<input class="remove-arrow input w-20" type="number" min="1" bind:value={validezDias} />
			</label>
			<label class="label cursor-pointer gap-2">
				<input
					class="checkbox checkbox-sm"
					type="checkbox"
					disabled={bloqueada}
					bind:checked={incluirIva}
				/>
				<span>Agregar IVA 21%</span>
			</label>
			<div class="flex items-center gap-2">
				<label class="flex items-center gap-3 text-sm font-semibold">
					<span>Total final</span>
					<input
						class="remove-arrow input w-40 text-right text-lg font-bold"
						type="number"
						min="0"
						step="0.01"
						aria-label="Precio final de la cotización"
						value={precioTotalEditado ? (precioTotalIngresado ?? '') : totalFinal.toFixed(2)}
						oninput={(event) => {
							precioTotalIngresado = event.currentTarget.value;
							precioTotalEditado = true;
							ajusteManualIngresado = redondearPrecio(
								(Number(event.currentTarget.value) || 0) - totalCalculado
							);
						}}
					/>
				</label>
				{#if totalFinal < totalCalculado}
					<div
						class="tooltip tooltip-left"
						data-tip={`El total final está por debajo de la base de cotización (${totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}).`}
					>
						<button
							type="button"
							class="btn btn-circle btn-ghost text-warning btn-xs"
							aria-label="El total final está por debajo de la base de venta"
						>
							i
						</button>
					</div>
				{/if}
			</div>
			<button
				class="btn btn-primary btn-sm"
				disabled={bloqueada || guardando}
				onclick={guardarCotizacion}
			>
				{guardando ? 'Guardando...' : bloqueada ? 'Convertida en pedido' : 'Guardar cotización'}
			</button>
		</div>
	</div>
</section>
