<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { FormFieldWrapper, PageLayout, Seccion } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import LineasConceptosEditor from '$lib/modulos/cotizaciones/componentes/LineasConceptosEditor.svelte';
	import type { LineaEdicion, ProductoOpcion } from '$lib/modulos/cotizaciones/tipos';
	import { editarPedido, getPedidoParaEditar } from '$lib/modulos/pedidos/pedidos.remote';
	import { getDatosCreacionPedido } from '$lib/modulos/pedidos/pedidos-consultas.remote';
	import { getProductosCatalogo } from '$lib/modulos/productos/productos.remote';
	import { mensajeError } from '$lib/utils/errores';
	import { NOMBRE_MONEDA, SIMBOLO_MONEDA, factorDesdeUsd } from '$lib/utils/moneda';
	import {
		formatearDosDecimales,
		formatearMoneda,
		parsearNumeroDecimal,
		redondearPrecio
	} from '$lib/utils/precios';

	const id = Number(page.params.id);
	const [edicion, catalogo] = await Promise.all([
		getPedidoParaEditar(id),
		getDatosCreacionPedido({})
	]);
	const { pedido } = edicion;
	const moneda = pedido.moneda;
	const factor = factorDesdeUsd(pedido);

	const fechaInput = (fecha: Date | string | null) =>
		fecha ? new Date(fecha).toISOString().slice(0, 10) : '';

	const lineasIniciales: LineaEdicion[] = [
		...edicion.lineas.map((linea, indice): LineaEdicion => {
			const precioLista = linea.precio_lista_unitario ?? 0;
			const precio = linea.precio_unitario ?? 0;
			return {
				idx: indice + 1,
				ref: `linea:${linea.id}`,
				bloqueo: linea.bloqueo,
				tipo: linea.es_personalizado || !linea.producto_id ? 'concepto' : 'producto',
				visible_cliente: precio > 0 || precioLista === 0,
				producto_id: linea.producto_id ? String(linea.producto_id) : '',
				insumo_id: undefined,
				insumos_snapshot: linea.insumos_snapshot ?? [],
				unidad: '',
				descripcion: linea.descripcion_personalizada ?? linea.producto_nombre ?? '',
				cantidad: linea.cantidad,
				precio_unitario: precio || precioLista,
				precio_lista_unitario: precioLista || precio,
				precio_minimo_unitario: 0,
				costo_materiales: linea.costo_materiales ?? 0
			};
		}),
		...edicion.insumosAdicionales.map(
			(insumo, indice): LineaEdicion => ({
				idx: edicion.lineas.length + indice + 1,
				ref: `insumo:${insumo.id}`,
				bloqueo: null,
				tipo: 'insumo',
				visible_cliente: (insumo.precio_unitario ?? 0) > 0,
				producto_id: '',
				insumo_id: insumo.insumo_id,
				insumos_snapshot: [],
				unidad: insumo.unidad,
				descripcion: insumo.nombre,
				cantidad: insumo.cantidad,
				precio_unitario: insumo.precio_lista_unitario ?? 0,
				precio_lista_unitario: insumo.precio_lista_unitario ?? 0,
				precio_minimo_unitario: 0,
				costo_materiales: insumo.costo_unitario ?? 0
			})
		)
	];

	const sumarLineas = (lineas: LineaEdicion[]) =>
		redondearPrecio(
			lineas
				.filter((linea) => linea.visible_cliente)
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
		);

	let lineas = $state(lineasIniciales);
	let productos = $state<ProductoOpcion[]>(
		catalogo.productos.data.map((producto) => {
			const detalle = producto as Partial<ProductoOpcion>;
			return {
				id: producto.id,
				nombre: producto.nombre,
				costo_materiales: detalle.costo_materiales ?? null,
				precio_venta: detalle.precio_venta ?? null
			};
		})
	);
	const insumos = catalogo.insumos.data.map((insumo) => ({
		id: insumo.id,
		codigo: insumo.codigo,
		nombre: insumo.nombre,
		unidad: insumo.unidad,
		costo_unitario: insumo.costo_unitario
	}));

	const totalOriginal = pedido.total ?? 0;
	let totalManual = $state(totalOriginal !== sumarLineas(lineasIniciales));
	let totalTexto = $state(formatearDosDecimales(totalOriginal));
	let anticipoTexto = $state(formatearDosDecimales(pedido.anticipo ?? 0));
	let entrega = $state(fechaInput(pedido.fecha_entrega_prometida));
	let observaciones = $state(pedido.observaciones ?? '');
	let guardando = $state(false);
	let solicitudProductos = 0;

	const suma = $derived(sumarLineas(lineas));
	const total = $derived(totalManual ? parsearNumeroDecimal(totalTexto) : suma);
	const anticipo = $derived(parsearNumeroDecimal(anticipoTexto) ?? 0);
	const fijas = $derived(lineas.filter((linea) => linea.bloqueo).length);

	async function buscarProductos(search: string) {
		const solicitud = ++solicitudProductos;
		const resultado = await getProductosCatalogo({ search: search || undefined, limit: 100 });
		if (solicitud !== solicitudProductos) return;
		productos = resultado.data.map((producto) => ({
			id: producto.id,
			nombre: producto.nombre,
			costo_materiales: null,
			precio_venta: null
		}));
	}

	function usarSuma() {
		totalManual = false;
		totalTexto = formatearDosDecimales(suma);
	}

	async function guardar(event: SubmitEvent) {
		event.preventDefault();
		if (guardando || total === null) return;
		guardando = true;
		try {
			await editarPedido({
				pedido_id: pedido.id,
				precio_total: redondearPrecio(total),
				anticipo: redondearPrecio(anticipo),
				fecha_entrega_prometida: entrega || null,
				observaciones: observaciones.trim() || null,
				lineas: lineas.map((linea) => ({
					ref: linea.ref,
					tipo: linea.tipo,
					visible_cliente: linea.visible_cliente,
					producto_id: linea.producto_id || undefined,
					insumo_id: linea.tipo === 'insumo' ? Number(linea.insumo_id) || undefined : undefined,
					nuevo_insumo: linea.nuevo_insumo,
					cantidad: linea.cantidad,
					precio: linea.precio_unitario,
					precio_lista: linea.precio_lista_unitario,
					costo_materiales: linea.costo_materiales,
					descripcion: linea.descripcion,
					insumos_asociados:
						linea.tipo === 'concepto'
							? linea.insumos_snapshot
									.filter((material) => material.insumo_id != null)
									.map((material) => ({
										insumo_id: Number(material.insumo_id),
										cantidad: material.cantidad
									}))
							: []
				}))
			});
			toast.success('Pedido actualizado');
			await goto(resolve(`/pedidos/${pedido.id}`));
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo guardar el pedido'));
		} finally {
			guardando = false;
		}
	}
</script>

<PageLayout>
	<form class="flex flex-col gap-4 sm:gap-6" onsubmit={guardar}>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<a
					class="text-sm text-base-content/60 hover:underline"
					href={resolve(`/pedidos/${pedido.id}`)}
				>
					← Pedido {pedido.numero_pedido}
				</a>
				<h1 class="text-xl font-semibold">Editar pedido {pedido.numero_pedido}</h1>
				<p class="text-sm text-base-content/60">
					{pedido.cliente?.razon_social ?? 'Sin cliente'} · {NOMBRE_MONEDA[moneda]} ({moneda})
				</p>
			</div>
		</div>

		{#if fijas}
			<div role="alert" class="alert alert-soft alert-info">
				<span>
					{fijas === 1 ? 'Una línea ya está' : `${fijas} líneas ya están`} en producción o con stock reservado:
					podés cambiar su precio y descripción, pero no el producto ni la cantidad.
				</span>
			</div>
		{/if}

		<LineasConceptosEditor
			bind:lineas
			{productos}
			onBuscarProducto={buscarProductos}
			{insumos}
			tiposInsumo={catalogo.tiposInsumo}
			categoriasInsumo={catalogo.categoriasInsumo}
			unidadesInsumo={catalogo.unidadesInsumo}
			bloqueada={guardando}
			{moneda}
			{factor}
			contexto="pedido"
			descuentoGlobal={0}
			totalBase={suma}
			importeDescuento={0}
			incluirIva={false}
			importeIva={0}
		/>

		<Seccion titulo="Datos del pedido">
			<div class="grid gap-4 md:grid-cols-3">
				<FormFieldWrapper
					id="total"
					label={`Total del pedido (${SIMBOLO_MONEDA[moneda]})`}
					ayuda={`Suma de líneas: ${formatearMoneda(suma, moneda)}`}
				>
					<div class="join w-full">
						<input
							id="total"
							class={['input join-item w-full text-right', total === null && 'input-error']}
							inputmode="decimal"
							value={totalManual ? totalTexto : formatearDosDecimales(suma)}
							oninput={(event) => {
								totalManual = true;
								totalTexto = event.currentTarget.value;
							}}
						/>
						{#if totalManual && total !== suma}
							<button type="button" class="btn join-item" onclick={usarSuma}>Usar suma</button>
						{/if}
					</div>
				</FormFieldWrapper>
				<FormFieldWrapper id="anticipo" label={`Anticipo (${SIMBOLO_MONEDA[moneda]})`}>
					<input
						id="anticipo"
						class="input w-full text-right"
						inputmode="decimal"
						bind:value={anticipoTexto}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="entrega" label="Entrega prometida">
					<input id="entrega" class="input w-full" type="date" bind:value={entrega} />
				</FormFieldWrapper>
				<div class="md:col-span-3">
					<FormFieldWrapper id="observaciones" label="Observaciones">
						<textarea
							id="observaciones"
							class="textarea w-full"
							rows="3"
							maxlength="2000"
							bind:value={observaciones}
						></textarea>
					</FormFieldWrapper>
				</div>
			</div>
		</Seccion>

		<div class="flex justify-end gap-2">
			<a class="btn btn-ghost" href={resolve(`/pedidos/${pedido.id}`)}>Cancelar</a>
			<button class="btn btn-primary" type="submit" disabled={guardando || total === null}>
				{guardando ? 'Guardando...' : 'Guardar cambios'}
			</button>
		</div>
	</form>
</PageLayout>
