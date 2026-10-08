<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Can,
		FormFieldWrapper,
		Modal,
		PageLayout,
		NavegacionProceso,
		Table
	} from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { getProductoConReceta } from '$lib/remote/productos.remote';
	import { SearchSelect } from '$lib/components/ui';
	import {
		asignarCotizacion,
		cambiarEstadoCotizacion,
		cotizarCotizacion,
		agregarNotaCotizacion,
		convertirCotizacionAPedido,
		eliminarAdjunto,
		eliminarCotizacion
	} from '$lib/remote/cotizaciones.remote';
	import { formatearFecha, formatearFechaHora } from '$lib/utils/fechas';
	import type { PageProps } from './$types';
	import { Paths } from '$lib/types';
	import { Document } from '$lib/components/ui/icons';
	import { redondearPrecio } from '$lib/utils/precios';

	let { data }: PageProps = $props();
	let cotizacion = $derived(data.cotizacion);

	// Acción de permiso requerida según el estado destino de cada transición
	const ACCION_POR_ESTADO: Record<string, string> = {
		asignada: 'asignar',
		en_cotizacion: 'cotizar',
		lista_para_enviar: 'cotizar',
		enviada: 'enviar',
		aprobada: 'aprobar',
		rechazada: 'edit'
	};

	// ── Asignación ──
	let empleadoSeleccionado = $derived(
		cotizacion.asignado?.id ? String(cotizacion.asignado.id) : ''
	);

	async function asignar() {
		if (!empleadoSeleccionado) return toast.error('Seleccioná un empleado');
		try {
			await asignarCotizacion({
				cotizacion_id: cotizacion.id,
				empleado_id: Number(empleadoSeleccionado)
			});
			toast.success('Cotización asignada');
			await invalidateAll();
		} catch {
			toast.error('Error al asignar');
		}
	}

	// ── Transiciones de estado ──
	async function cambiarEstado(estado_destino_id: number) {
		try {
			await cambiarEstadoCotizacion({ cotizacion_id: cotizacion.id, estado_destino_id });
			toast.success('Estado actualizado');
			await invalidateAll();
		} catch {
			toast.error('Transición no permitida');
		}
	}

	// ── Cotización (líneas y precios) ──
	let productos = $derived(data.productos);
	let validezDias = $derived(cotizacion.validez_dias ?? 15);
	let lineas = $state<any[]>([]);
	let notaEnRedaccion = $state('');
	let guardandoNota = $state(false);

	$effect(() => {
		lineas = (data.lineas ?? []).map((l: any) => {
			const producto = data.productos.find((item: any) => item.id === l.producto_id);
			const insumo = data.insumos.find((item: any) => item.id === l.insumo_id);
			const precio_minimo_unitario = producto?.precio_venta ?? insumo?.costo_unitario ?? 0;
			const precio_lista_unitario = Math.max(
				l.precio_lista_unitario ?? l.precio_unitario,
				precio_minimo_unitario
			);
			return {
				idx: l.id,
				tipo: l.producto_id ? 'producto' : l.insumo_id ? 'insumo' : 'personalizado',
				producto_id: l.producto_id ? String(l.producto_id) : '',
				insumo_id: l.insumo_id ?? undefined,
				unidad: l.insumo_unidad ?? '',
				insumos_snapshot: l.insumos_snapshot ?? [],
				descripcion: l.descripcion,
				cantidad: l.cantidad,
				precio_unitario: l.precio_unitario,
				precio_lista_unitario,
				precio_minimo_unitario,
				margen_porcentaje: l.margen_porcentaje ?? 0,
				descuento_porcentaje: l.descuento_porcentaje ?? 0,
				justificacion_descuento: l.justificacion_descuento ?? '',
				costo_mano_obra: l.costo_mano_obra ?? 0,
				costo_materiales: l.costo_materiales ?? 0
			};
		});
	});

	let total = $derived(
		Number(
			lineas
				.reduce((s: number, l: any) => s + (l.cantidad || 0) * (l.precio_unitario || 0), 0)
				.toFixed(2)
		)
	);

	function agregarProductoLinea() {
		lineas = [
			...lineas,
			{
				idx: Date.now(),
				tipo: 'producto',
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
			}
		];
	}
	function agregarInsumoLinea() {
		lineas = [
			...lineas,
			{
				idx: Date.now(),
				tipo: 'insumo',
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
			}
		];
	}

	function agregarLineaPersonalizada() {
		lineas = [
			...lineas,
			{
				idx: Date.now(),
				tipo: 'personalizado',
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
			}
		];
	}

	function eliminarLinea(idx: number) {
		if (lineas.length > 1) lineas = lineas.filter((l: any) => l.idx !== idx);
	}

	function actualizarDescuento(
		lineaId: number,
		campo: 'porcentaje' | 'justificacion',
		valor: string
	) {
		lineas = lineas.map((linea: any) => {
			if (linea.idx !== lineaId) return linea;
			const descuento_porcentaje =
				campo === 'porcentaje'
					? Math.min(Math.max(Number(valor) || 0, 0), 99.99)
					: Number(linea.descuento_porcentaje || 0);
			const justificacion_descuento =
				descuento_porcentaje === 0
					? ''
					: campo === 'justificacion'
						? valor
						: linea.justificacion_descuento;
			return {
				...linea,
				descuento_porcentaje,
				justificacion_descuento,
				precio_unitario: redondearPrecio(
					Number(linea.precio_lista_unitario || 0) * (1 - descuento_porcentaje / 100)
				)
			};
		});
	}

	function actualizarPrecioLista(lineaId: number, valor: string) {
		lineas = lineas.map((linea: any) => {
			if (linea.idx !== lineaId) return linea;
			const precio_lista_unitario = Math.max(
				Number(valor) || 0,
				Number(linea.precio_minimo_unitario || 0)
			);
			return {
				...linea,
				precio_lista_unitario,
				precio_unitario: redondearPrecio(
					precio_lista_unitario * (1 - Number(linea.descuento_porcentaje || 0) / 100)
				)
			};
		});
	}

	async function onProductoChange(lineaId: number, value: string) {
		if (!value) {
			lineas = lineas.map((linea: any) =>
				linea.idx === lineaId
					? {
							...linea,
							tipo: 'producto',
							producto_id: '',
							insumo_id: undefined,
							unidad: '',
							descripcion: '',
							costo_materiales: 0,
							precio_lista_unitario: 0,
							precio_minimo_unitario: 0,
							margen_porcentaje: 0,
							descuento_porcentaje: 0,
							justificacion_descuento: '',
							precio_unitario: 0,
							insumos_snapshot: []
						}
					: linea
			);
			return;
		}
		try {
			const { producto, receta } = await getProductoConReceta(Number(value));

			const insumosSnapshot = receta.map((insumo) => ({
				insumo_id: insumo.insumo_id,
				codigo: insumo.codigo,
				nombre: insumo.nombre,
				cantidad: insumo.cantidad,
				costo_unitario: Number((insumo.costo_unitario ?? 0).toFixed(2)),
				unidad: insumo.unidad,
				subtotal: Number(((insumo.cantidad || 0) * (insumo.costo_unitario ?? 0)).toFixed(2))
			}));
			const costoMateriales = producto.costo_materiales ?? 0;
			lineas = lineas.map((linea: any) =>
				linea.idx === lineaId
					? {
							...linea,
							tipo: 'producto',
							producto_id: value,
							insumo_id: undefined,
							unidad: '',
							descripcion: producto.nombre,
							costo_materiales: costoMateriales,
							margen_porcentaje: producto.margen_porcentaje ?? 0,
							descuento_porcentaje: 0,
							justificacion_descuento: '',
							precio_lista_unitario: producto.precio_venta,
							precio_minimo_unitario: producto.precio_venta,
							precio_unitario: producto.precio_venta,
							insumos_snapshot: insumosSnapshot
						}
					: linea
			);
		} catch {
			toast.error('No se pudo cargar la receta del producto');
		}
	}

	function onInsumoChange(lineaId: number, value: string) {
		const insumo = data.insumos.find((item: any) => Number(item.id) === Number(value));
		if (!value || !insumo) {
			lineas = lineas.map((linea: any) =>
				linea.idx === lineaId
					? {
							...linea,
							insumo_id: '',
							producto_id: '',
							unidad: '',
							descripcion: '',
							costo_materiales: 0,
							precio_lista_unitario: 0,
							precio_minimo_unitario: 0,
							margen_porcentaje: 0,
							descuento_porcentaje: 0,
							justificacion_descuento: '',
							precio_unitario: 0,
							insumos_snapshot: []
						}
					: linea
			);
			return;
		}
		lineas = lineas.map((linea: any) =>
			linea.idx === lineaId
				? {
						...linea,
						tipo: 'insumo',
						insumo_id: value,
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
					}
				: linea
		);
	}

	async function guardarCotizacion() {
		try {
			await cotizarCotizacion({
				cotizacion_id: cotizacion.id,
				validez_dias: Number(validezDias) || 15,
				lineas: lineas.map((l: any) => ({
					producto_id: l.producto_id || undefined,
					insumo_id: l.insumo_id ? Number(l.insumo_id) : undefined,
					es_personalizado: l.tipo === 'personalizado',
					descripcion:
						l.descripcion ||
						(l.insumo_id
							? data.insumos.find((insumo: any) => insumo.id === Number(l.insumo_id))?.nombre
							: '') ||
						'',
					cantidad: Number(l.cantidad) || 1,
					precio_unitario: Number(l.precio_unitario) || 0,
					precio_lista_unitario: Number(l.precio_lista_unitario) || 0,
					descuento_porcentaje: Number(l.descuento_porcentaje) || 0,
					justificacion_descuento: l.justificacion_descuento || undefined,
					costo_mano_obra: Number(l.costo_mano_obra) || 0,
					costo_materiales: Number(l.costo_materiales) || 0
				}))
			});
			toast.success('Cotización guardada');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Error al guardar la cotización');
		}
	}

	// ── Adjuntos (audios/fotos de WhatsApp) ──
	let subiendo = $state(false);
	async function subirArchivos(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files?.length) return;
		subiendo = true;
		const fd = new FormData();
		for (const f of input.files) fd.append('archivos', f);
		try {
			const res = await fetch(`/cotizaciones/${cotizacion.id}/adjuntos`, {
				method: 'POST',
				body: fd
			});
			if (!res.ok) throw new Error();
			toast.success('Archivos adjuntados');
			input.value = '';
			await invalidateAll();
		} catch {
			toast.error('Error al subir archivos');
		}
		subiendo = false;
	}

	async function guardarNota() {
		const contenido = notaEnRedaccion.trim();
		if (!contenido) return;

		guardandoNota = true;
		try {
			await agregarNotaCotizacion({ cotizacion_id: cotizacion.id, contenido });
			notaEnRedaccion = '';
			toast.success('Nota agregada');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo agregar la nota');
		} finally {
			guardandoNota = false;
		}
	}

	async function generarPedido() {
		try {
			const { pedidoId } = await convertirCotizacionAPedido(cotizacion.id);
			toast.success('Pedido generado');
			goto(resolve(`/pedidos/${pedidoId}`));
		} catch (e: any) {
			toast.error(e?.message ?? 'No se pudo generar el pedido');
		}
	}

	const esImagen = (m: string | null) => m?.startsWith('image/');
	const esAudio = (m: string | null) => m?.startsWith('audio/');
	const urlAdjunto = (adjuntoId: number) =>
		resolve(`/cotizaciones/${cotizacion.id}/adjuntos/${adjuntoId}`);

	let showEliminar = $state(false);

	function abrirEliminar() {
		showEliminar = true;
	}

	function cerrarModal() {
		showEliminar = false;
	}

	async function confirmarEliminar() {
		if (!cotizacion) return;
		try {
			await eliminarCotizacion(cotizacion.id);
			toast.success('Cotización eliminada');
			await invalidateAll();
			goto(resolve(Paths.COTIZACIONES));
		} catch (e) {
			console.log(e);
			toast.error('No se pudo eliminar');
		} finally {
			cerrarModal();
		}
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-4">
		<div class="grid items-center gap-3 lg:grid-cols-[auto_1fr_auto]">
			<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>
			<div class="flex justify-center">
				<NavegacionProceso
					currentKey="cotizacion"
					steps={[
						{ key: 'cotizacion', label: 'Cotización', status: cotizacion.estado.nombre },
						...(cotizacion.navegacion.pedido_id
							? [
									{
										key: 'pedido',
										label: 'Pedido',
										href: `/pedidos/${cotizacion.navegacion.pedido_id}`
									}
								]
							: []),
						...(cotizacion.navegacion.orden_fabricacion_id
							? [
									{
										key: 'fabricacion',
										label: 'Fabricación',
										href: `/fabricacion/${cotizacion.navegacion.orden_fabricacion_id}`
									}
								]
							: [])
					]}
				/>
			</div>

			<div class="flex items-center gap-2">
				{#if cotizacion.estado.slug === 'aprobada' && !cotizacion.pedido_id}
					<Can modulo="cotizaciones" accion="convertir">
						<button class="btn btn-outline btn-sm btn-success" onclick={generarPedido}
							>Generar Pedido</button
						>
					</Can>
				{/if}
				<a
					class="btn btn-outline btn-sm"
					href={resolve(`/cotizaciones/${cotizacion.id}/pdf`)}
					target="_blank"
				>
					<Document /> PDF
				</a>
				<Can modulo="cotizaciones" accion="delete">
					<button class="btn btn-outline btn-error btn-sm" onclick={abrirEliminar}>Eliminar</button>
				</Can>
			</div>
		</div>

		<!-- Cliente -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="grid grid-cols-4 gap-4">
					{#if cotizacion.cliente?.id}
						<FormFieldWrapper label="Cliente" id="cliente">
							<p class="font-medium">
								{cotizacion.cliente.nombre}
								{cotizacion.cliente.apellido ?? ''}
								{cotizacion.cliente.razon_social ?? ''} -
								{cotizacion.cliente.telefono ?? ''}
							</p>
						</FormFieldWrapper>
					{:else}
						<p class="flex flex-col gap-1">
							<span class="font-medium">{cotizacion.cliente_nombre}</span>
							{#if cotizacion.cliente_telefono}
								<span>{cotizacion.cliente_telefono ?? ''}</span>
							{/if}
							<span class="text-base-content/50">No cargado como contacto</span>
						</p>
					{/if}
					<FormFieldWrapper label="Fecha" id="fecha">
						<p>{formatearFecha(cotizacion.created_at)}</p>
					</FormFieldWrapper>
					<FormFieldWrapper label="Estado" id="estado">
						<div class="flex flex-wrap items-center gap-2">
							<span class="badge badge-{cotizacion.estado.color}">{cotizacion.estado.nombre}</span>
							{#if cotizacion.transiciones?.length > 0}
								<button
									class="btn btn-outline btn-xs"
									tabindex="0"
									style="anchor-name:--anchor-1"
									popovertarget="popover-1">Acciones ↓</button
								>
								<ul
									popover
									id="popover-1"
									style="position-anchor:--anchor-1"
									class="menu dropdown w-52 rounded-box bg-base-100 p-2 shadow"
								>
									{#each cotizacion.transiciones as t (t.estado_destino_id)}
										<li>
											<Can
												modulo="cotizaciones"
												accion={ACCION_POR_ESTADO[t.destino_slug] ?? 'edit'}
											>
												<button onclick={() => cambiarEstado(t.estado_destino_id)}>
													<span class="badge badge-{t.destino_color} badge-xs"></span>
													{t.destino_nombre}
												</button>
											</Can>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</FormFieldWrapper>
					<Can modulo="cotizaciones" accion="asignar">
						<FormFieldWrapper label="Asignado a" id="asignar">
							<select class="select select-sm" bind:value={empleadoSeleccionado}>
								<option value="">Sin asignar</option>
								{#each data.empleados as emp (emp.id)}
									<option value={emp.id.toString()}>{emp.nombre} {emp.apellido ?? ''}</option>
								{/each}
							</select>
							<button class="btn btn-primary btn-sm" onclick={asignar}>Asignar</button>
						</FormFieldWrapper>
					</Can>
					<FormFieldWrapper label="Descripción" id="descripcion" class="col-span-4">
						<p class="whitespace-pre-wrap">{cotizacion.descripcion}</p>
						{#if cotizacion.observaciones}
							<p class="mt-2 text-sm text-base-content/60">📝 {cotizacion.observaciones}</p>
						{/if}
					</FormFieldWrapper>
				</div>
			</div>
		</div>

		<!-- Cotización / precios (Oficina Técnica) -->
		<Can modulo="cotizaciones" accion="cotizar">
			<div class="card bg-base-100 shadow lg:col-span-2">
				<div class="card-body gap-4">
					<h2 class="card-title">Detalles y precios</h2>
					{#if cotizacion.pedido_id}
						<p class="text-sm text-base-content/60">Cotización convertida: precios bloqueados.</p>
					{/if}
					<div class="flex flex-wrap justify-end gap-2">
						<button
							type="button"
							disabled={!!cotizacion.pedido_id}
							onclick={agregarProductoLinea}
							class="btn btn-outline btn-sm">+ Producto</button
						>
						<button
							type="button"
							disabled={!!cotizacion.pedido_id}
							onclick={agregarInsumoLinea}
							class="btn btn-outline btn-sm">+ Insumo</button
						>
						<button
							type="button"
							disabled={!!cotizacion.pedido_id}
							onclick={agregarLineaPersonalizada}
							class="btn btn-outline btn-sm">+ Línea personalizada</button
						>
					</div>
					{#each lineas as linea (linea.idx)}
						<div class="card relative gap-1 border border-base-300 bg-base-100 p-3">
							<button
								type="button"
								disabled={!!cotizacion.pedido_id}
								onclick={() => eliminarLinea(linea.idx)}
								class="btn absolute top-1 right-1 btn-circle btn-ghost btn-xs"
								class:hidden={lineas.length === 1}>✕</button
							>
							<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-12">
								{#if linea.tipo === 'producto'}
									<div class="min-w-0 lg:col-span-4">
										<SearchSelect
											label="Producto"
											id={`producto-${linea.idx}`}
											placeholder="Buscar producto..."
											disabled={!!cotizacion.pedido_id}
											field={{
												value: () => linea.producto_id || '',
												set: (value: string) => {
													lineas = lineas.map((l: any) =>
														l.idx === linea.idx
															? { ...l, producto_id: value, insumo_id: undefined }
															: l
													);
												}
											}}
											options={productos.map((p) => ({
												value: p.id.toString(),
												label: p.nombre
											}))}
											onChange={(value: string) => onProductoChange(linea.idx, value)}
										/>
									</div>
								{:else if linea.tipo === 'insumo'}
									<div class="min-w-0 lg:col-span-4">
										<SearchSelect
											label="Insumo"
											id={`insumo-${linea.idx}`}
											placeholder="Buscar insumo..."
											disabled={!!cotizacion.pedido_id}
											field={{
												value: () => String(linea.insumo_id ?? ''),
												set: (value: string) => {
													lineas = lineas.map((l: any) =>
														l.idx === linea.idx ? { ...l, insumo_id: value } : l
													);
												}
											}}
											options={data.insumos.map((insumo) => ({
												value: String(insumo.id),
												label: `${insumo.codigo} - ${insumo.nombre}`
											}))}
											onChange={(value: string) => onInsumoChange(linea.idx, value)}
										/>
									</div>
								{:else}
									<FormFieldWrapper
										label="Concepto para el cliente"
										id={`descripcion-${linea.idx}`}
									>
										<input
											class="input"
											required
											disabled={!!cotizacion.pedido_id}
											bind:value={linea.descripcion}
											placeholder="Descripción visible en la cotización"
										/>
									</FormFieldWrapper>
								{/if}
								{#if linea.tipo === 'insumo'}
									<FormFieldWrapper label="Unidad" id="unidad">
										<div class="input flex items-center bg-base-200">{linea.unidad || '-'}</div>
									</FormFieldWrapper>
								{/if}
								<FormFieldWrapper label="Cantidad" id="cantidad">
									<input
										class="remove-arrow input"
										type="number"
										min="1"
										disabled={!!cotizacion.pedido_id}
										bind:value={linea.cantidad}
									/>
								</FormFieldWrapper>
								<FormFieldWrapper label="Costo" id="costo_materiales">
									<div class="input flex items-center bg-base-200">
										${Number(linea.costo_materiales || 0).toLocaleString('es-AR', {
											minimumFractionDigits: 2
										})}
									</div>
								</FormFieldWrapper>
								<FormFieldWrapper label="Precio lista" id="precio_lista_unitario">
									<input
										id={`precio-lista-${linea.idx}`}
										class="remove-arrow input"
										type="number"
										min={linea.precio_minimo_unitario ?? 0}
										step="0.01"
										disabled={!!cotizacion.pedido_id}
										value={linea.precio_lista_unitario}
										oninput={(event) =>
											actualizarPrecioLista(
												linea.idx,
												(event.currentTarget as HTMLInputElement).value
											)}
									/>
								</FormFieldWrapper>
								<Can modulo="cotizaciones" accion="descuento">
									<FormFieldWrapper label="Descuento (%)" id={`descuento-${linea.idx}`}>
										<input
											id={`descuento-${linea.idx}`}
											class="remove-arrow input"
											type="number"
											min="0"
											max="99.99"
											step="0.01"
											disabled={!!cotizacion.pedido_id}
											value={linea.descuento_porcentaje}
											oninput={(event) =>
												actualizarDescuento(
													linea.idx,
													'porcentaje',
													(event.currentTarget as HTMLInputElement).value
												)}
										/>
									</FormFieldWrapper>
									{#if linea.descuento_porcentaje > 0}
										<FormFieldWrapper
											label="Motivo del descuento"
											id={`motivo-${linea.idx}`}
											required
										>
											<input
												id={`motivo-${linea.idx}`}
												class="input"
												required
												disabled={!!cotizacion.pedido_id}
												value={linea.justificacion_descuento}
												oninput={(event) =>
													actualizarDescuento(
														linea.idx,
														'justificacion',
														(event.currentTarget as HTMLInputElement).value
													)}
											/>
										</FormFieldWrapper>
									{/if}
								</Can>
								{#if linea.descuento_porcentaje > 0}
									<div class="self-end text-xs text-base-content/60">
										Lista × {linea.cantidad} · {linea.descuento_porcentaje}%
										{linea.justificacion_descuento ? `· ${linea.justificacion_descuento}` : ''}
									</div>
								{/if}
								<FormFieldWrapper label="Precio neto U." id="precio_unitario">
									<div class="input flex items-center bg-base-200 font-semibold">
										${linea.precio_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
									</div>
								</FormFieldWrapper>
								<FormFieldWrapper label="Subtotal" id="subtotal">
									<div class="input flex items-center bg-base-200 font-semibold">
										${((linea.cantidad || 0) * (linea.precio_unitario || 0)).toLocaleString(
											'es-AR',
											{
												minimumFractionDigits: 2
											}
										)}
									</div>
								</FormFieldWrapper>
							</div>
							{#if linea.tipo === 'producto' && linea.insumos_snapshot?.length}
								<div class="collapse-arrow collapse bg-base-200 p-0 text-sm">
									<input type="checkbox" />
									<div class="collapse-title ps-12 pe-4 after:inset-s-5 after:inset-e-auto">
										Insumos del producto
									</div>
									<ul class="collapse-content z-1 flex flex-col gap-1 text-sm">
										{#each linea.insumos_snapshot as material, materialIndex (`${material.insumo_id}-${materialIndex}`)}
											<li class="flex justify-between gap-3">
												<span>{material.cantidad} {material.unidad} · {material.nombre}</span>
												<span
													>${material.subtotal.toLocaleString('es-AR', {
														minimumFractionDigits: 2
													})}</span
												>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/each}

					<div class="flex items-center justify-end gap-4">
						<label class="flex items-center gap-2 text-sm">
							Validez (días)
							<input
								class="remove-arrow input w-20"
								type="number"
								min="1"
								bind:value={validezDias}
							/>
						</label>
						<p class="grow-0 text-2xl font-bold">
							${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
						</p>
						<button
							disabled={!!cotizacion.pedido_id}
							class="btn btn-primary btn-sm"
							onclick={guardarCotizacion}
						>
							{cotizacion.pedido_id ? 'Convertida en pedido' : 'Guardar cotización'}
						</button>
					</div>
				</div>
			</div>
		</Can>

		<!-- Adjuntos -->
		<div class="card bg-base-100 shadow lg:col-span-2">
			<div class="card-body gap-6">
				<h2 class="card-title">Archivos adjuntos</h2>
				<input
					type="file"
					multiple
					accept="image/*,audio/*,video/*,application/pdf"
					class="file-input mt-3 w-full max-w-md"
					disabled={subiendo}
					onchange={subirArchivos}
				/>
				<div class="flex flex-wrap gap-3">
					{#each data.adjuntos as adj (adj.id)}
						<div class="card bg-base-100">
							{#if esImagen(adj.mime_type)}
								<img
									src={urlAdjunto(adj.id)}
									alt={adj.nombre_original}
									class="h-40 w-full rounded-t-xl object-cover"
								/>
							{:else if esAudio(adj.mime_type)}
								<div class="p-3">
									<audio controls src={urlAdjunto(adj.id)} class="w-full"></audio>
								</div>
							{/if}
							<div class="flex items-center justify-between p-2 text-xs">
								<span class="truncate underline">{adj.nombre_original}</span>
								<Can modulo="cotizaciones" accion="edit">
									<button
										class="btn btn-ghost text-error btn-xs"
										onclick={async () => {
											await eliminarAdjunto(adj.id);
											await invalidateAll();
										}}>✕</button
									>
								</Can>
							</div>
						</div>
					{:else}
						<p class="text-sm text-base-content/50">Sin archivos adjuntos.</p>
					{/each}
				</div>
			</div>
		</div>

		<!-- Seguimiento interno -->
		<div class="card bg-base-100 shadow lg:col-span-2">
			<div class="card-body gap-4">
				<h2 class="card-title">Seguimiento interno</h2>
				<Can modulo="cotizaciones" accion="edit">
					<textarea
						class="textarea w-full"
						rows="3"
						maxlength="5000"
						placeholder="Novedades del cliente, acuerdos o cambios solicitados..."
						bind:value={notaEnRedaccion}
					></textarea>
					<div class="flex justify-end">
						<button
							type="button"
							class="btn btn-primary btn-sm"
							disabled={guardandoNota || !notaEnRedaccion.trim()}
							onclick={guardarNota}
						>
							{guardandoNota ? 'Agregando...' : 'Agregar nota'}
						</button>
					</div>
				</Can>
				{#if data.notas.length}
					<ol class="flex flex-col gap-4 border-s border-base-300 ps-4">
						{#each data.notas as nota (nota.id)}
							<li class="relative">
								<span class="absolute inset-s-[-1.32rem] top-1.5 size-2 rounded-full bg-primary"
								></span>
								<p class="text-sm font-medium">
									{nota.autor} <span class="font-normal text-base-content/60">·</span>
									<span class="font-normal text-base-content/60">
										{formatearFechaHora(nota.fecha)}
									</span>
								</p>
								<p class="mt-1 text-sm whitespace-pre-wrap">{nota.contenido}</p>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="text-sm text-base-content/60">Todavía no hay notas.</p>
				{/if}
			</div>
		</div>

		<!-- Historial -->
		<div class="card bg-base-100 shadow lg:col-span-2">
			<div class="card-body">
				<h3 class="card-title">Historial</h3>
				{#snippet headerHistorial()}
					<th>Fecha</th>
					<th>Estado anterior</th>
					<th>Estado nuevo</th>
					<th>Empleado</th>
					<th>Comentario</th>
				{/snippet}
				{#snippet rowHistorial(log: (typeof data.historial)[number])}
					<td>
						{log.fecha ? formatearFecha(new Date(log.fecha)) : '-'}
					</td>
					<td>
						<span class="badge badge-sm badge-{log.estado_anterior?.color || 'ghost'}">
							{log.estado_anterior?.nombre || '-'}
						</span>
					</td>
					<td>
						<span class="badge badge-sm badge-{log.estado_nuevo?.color || 'ghost'}">
							{log.estado_nuevo?.nombre || '-'}
						</span>
					</td>
					<td>{log.empleado ?? '-'}</td>
					<td>{log.comentario ?? '-'}</td>
				{/snippet}
				<Table data={data.historial} header={headerHistorial} row={rowHistorial} />
			</div>
		</div>
	</div>
</PageLayout>

<Modal bind:open={showEliminar} title="Eliminar Cotización" onClose={cerrarModal}>
	<p>¿Eliminar la cotización <strong>{cotizacion?.numero_cotizacion}</strong>?</p>

	{#snippet actions()}
		<button class="btn" onclick={cerrarModal}>Cancelar</button>
		<button class="btn btn-error" onclick={confirmarEliminar}>Eliminar</button>
	{/snippet}
</Modal>
