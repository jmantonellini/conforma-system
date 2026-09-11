<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		asignarCotizacion,
		cambiarEstadoCotizacion,
		cotizarCotizacion,
		convertirCotizacionAPedido,
		eliminarAdjunto,
		eliminarCotizacion
	} from '$lib/remote/cotizaciones.remote';
	import { getProductos } from '$lib/remote/productos.remote';
	import { formatearFecha } from '$lib/utils/fechas';
	import type { PageProps } from './$types';
	import { Paths } from '$lib/types';
	import { Document } from '$lib/components/ui/icons';

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
	let productos = await getProductos({ limit: 100 });
	let validezDias = $derived(cotizacion.validez_dias ?? 15);
	let lineas = $derived(
		data.lineas.map((l: any) => ({
			idx: l.id,
			producto_id: l.producto_id ? String(l.producto_id) : '',
			descripcion: l.descripcion,
			cantidad: l.cantidad,
			precio_unitario: l.precio_unitario,
			costo_mano_obra: l.costo_mano_obra ?? 0,
			costo_materiales: l.costo_materiales ?? 0
		}))
	);

	let total = $derived(
		lineas.reduce((s: number, l: any) => s + (l.cantidad || 0) * (l.precio_unitario || 0), 0)
	);

	function agregarLinea() {
		lineas = [
			...lineas,
			{
				idx: Date.now(),
				producto_id: '',
				descripcion: '',
				cantidad: 1,
				precio_unitario: 0,
				costo_mano_obra: 0,
				costo_materiales: 0
			}
		];
	}
	function eliminarLinea(idx: number) {
		if (lineas.length > 1) lineas = lineas.filter((l: any) => l.idx !== idx);
	}
	function onProductoChange(l: any) {
		if (l.producto_id) {
			const p = productos.data.find((p: any) => p.id.toString() === l.producto_id);
			if (p?.precio_base != null) l.precio_unitario = p.precio_base;
		}
	}

	async function guardarCotizacion() {
		try {
			await cotizarCotizacion({
				cotizacion_id: cotizacion.id,
				validez_dias: Number(validezDias) || 15,
				lineas: lineas.map((l: any) => ({
					producto_id: l.producto_id || undefined,
					es_personalizado: !l.producto_id,
					descripcion: l.descripcion,
					cantidad: Number(l.cantidad) || 1,
					precio_unitario: Number(l.precio_unitario) || 0,
					costo_mano_obra: Number(l.costo_mano_obra) || 0,
					costo_materiales: Number(l.costo_materiales) || 0
				}))
			});
			toast.success('Cotización guardada');
			await invalidateAll();
		} catch {
			toast.error('Error al guardar');
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

	async function generarPedido() {
		try {
			await convertirCotizacionAPedido(cotizacion.id).then((pedidoId) => {
				toast.success('Pedido generado');
				goto(resolve(`/pedidos/${pedidoId}`));
			});
		} catch (e: any) {
			toast.error(e?.message ?? 'No se pudo generar el pedido');
		}
	}

	const esImagen = (m: string | null) => m?.startsWith('image/');
	const esAudio = (m: string | null) => m?.startsWith('audio/');
	const urlAdjunto = (url: string) =>
		url.startsWith('static/') ? `/${url.slice('static/'.length)}` : url;

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
		<div class="flex items-center justify-between">
			<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>

			{#if cotizacion.estado.slug === 'aprobada' && !cotizacion.pedido_id}
				<Can modulo="cotizaciones" accion="convertir">
					<button class="btn btn-outline btn-sm btn-success" onclick={generarPedido}
						>Generar Pedido</button
					>
				</Can>
			{/if}
			{#if cotizacion.pedido_id}
				<a class="btn btn-outline btn-sm" href={resolve(`/pedidos/${cotizacion.pedido_id}`)}>
					Ver pedido #{cotizacion.pedido_id}
				</a>
			{/if}
			<div class="flex items-center gap-2">
				<a
					class="btn btn-outline btn-sm"
					href={resolve(`/cotizaciones/${cotizacion.id}/pdf`)}
					target="_blank"
				>
					<Document /> PDF
				</a>
				<Can modulo="cotizaciones" accion="delete">
					<button class="btn btn-outline btn-error btn-sm" onclick={abrirEliminar}>
						Eliminar
					</button>
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
						<p class="font-medium">{cotizacion.cliente_nombre}</p>
						<p>{cotizacion.cliente_telefono ?? ''}</p>
						<p class="text-base-content/50">Contacto no cargado como cliente</p>
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
						<FormFieldWrapper label="Asignar" id="asignar">
							<select class="select" bind:value={empleadoSeleccionado}>
								<option value="">Sin asignar</option>
								{#each data.empleados as emp (emp.id)}
									<option value={emp.id.toString()}>{emp.nombre} {emp.apellido ?? ''}</option>
								{/each}
							</select>
							<button class="btn btn-primary btn-sm" onclick={asignar}>Asignar</button>
						</FormFieldWrapper>
					</Can>
				</div>
			</div>
		</div>

		<!-- Consulta del cliente -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Petición</h2>
				<p class="whitespace-pre-wrap">{cotizacion.descripcion}</p>
				{#if cotizacion.observaciones}
					<p class="mt-2 text-sm text-base-content/60">📝 {cotizacion.observaciones}</p>
				{/if}
			</div>
		</div>

		<!-- Cotización / precios (Oficina Técnica) -->
		<Can modulo="cotizaciones" accion="cotizar">
			<div class="card bg-base-100 shadow lg:col-span-2">
				<div class="card-body gap-4">
					<h2 class="card-title">Detalles y precios</h2>
					<button type="button" onclick={agregarLinea} class="btn self-end btn-outline btn-sm"
						>+ Agregar línea</button
					>
					{#each lineas as linea (linea.idx)}
						<div class="card relative border border-base-300 bg-base-100 p-4">
							<button
								type="button"
								onclick={() => eliminarLinea(linea.idx)}
								class="btn absolute top-1 right-1 btn-circle btn-ghost btn-xs"
								class:hidden={lineas.length === 1}>✕</button
							>
							<div class="grid gap-3 lg:grid-cols-12">
								<FormFieldWrapper class="lg:col-span-3" label="Producto" id="producto_id">
									<select
										class="select w-full"
										id="product_id"
										bind:value={linea.producto_id}
										onchange={() => onProductoChange(linea)}
									>
										<option value="">📝 Personalizado</option>
										{#each productos.data as p (p.id)}
											<option value={p.id.toString()}>{p.nombre}</option>
										{/each}
									</select>
								</FormFieldWrapper>
								<FormFieldWrapper class="lg:col-span-4" label="Descripción" id="descripcion">
									<input
										class="input"
										placeholder="Descripción del trabajo"
										bind:value={linea.descripcion}
									/>
								</FormFieldWrapper>
								<FormFieldWrapper label="Cantidad" id="cantidad">
									<input
										class="remove-arrow input md:col-span-1"
										type="number"
										min="1"
										bind:value={linea.cantidad}
									/>
								</FormFieldWrapper>
								<FormFieldWrapper class="lg:col-span-2" label="Precio unit." id="precio_unitario">
									<input
										class="remove-arrow input"
										type="number"
										min="0"
										step="0.01"
										placeholder="Precio unit."
										bind:value={linea.precio_unitario}
									/>
								</FormFieldWrapper>
								<FormFieldWrapper label="M.O." id="costo_mano_obra">
									<input
										class="remove-arrow input"
										type="number"
										min="0"
										step="0.01"
										placeholder="M.O."
										title="Costo mano de obra"
										bind:value={linea.costo_mano_obra}
									/>
								</FormFieldWrapper>
								<FormFieldWrapper label="Materiales" id="costo_materiales">
									<input
										class="remove-arrow input lg:col-span-1"
										type="number"
										min="0"
										step="0.01"
										placeholder="Mat."
										title="Costo materiales"
										bind:value={linea.costo_materiales}
									/>
								</FormFieldWrapper>
							</div>
						</div>
					{/each}

					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<label class="flex items-center gap-2 text-sm">
								Validez (días)
								<input
									class="remove-arrow input w-20"
									type="number"
									min="1"
									bind:value={validezDias}
								/>
							</label>
							<p class="text-2xl font-bold">
								${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
							</p>
							<button class="btn btn-primary" onclick={guardarCotizacion}>Guardar cotización</button
							>
						</div>
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
									src={urlAdjunto(adj.archivo_url)}
									alt={adj.nombre_original}
									class="h-40 w-full rounded-t-xl object-cover"
								/>
							{:else if esAudio(adj.mime_type)}
								<div class="p-3">
									<audio controls src={urlAdjunto(adj.archivo_url)} class="w-full"></audio>
								</div>
							{/if}
							<div class="flex items-center justify-between p-2 text-xs">
								<span class="truncate underline">{adj.nombre_original}</span>
								<button
									class="btn btn-ghost text-error btn-xs"
									onclick={async () => {
										await eliminarAdjunto(adj.id);
										await invalidateAll();
									}}>✕</button
								>
							</div>
						</div>
					{:else}
						<p class="text-sm text-base-content/50">Sin archivos adjuntos.</p>
					{/each}
				</div>
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
				{#snippet rowHistorial(log)}
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
