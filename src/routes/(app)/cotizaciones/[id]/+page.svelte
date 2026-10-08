<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Can,
		FormFieldWrapper,
		Modal,
		NavegacionProceso,
		PageLayout,
		Table
	} from '$lib/components/ui';
	import CotizacionLineasEditor from '$lib/components/cotizaciones/CotizacionLineasEditor.svelte';
	import { Document } from '$lib/components/ui/icons';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		agregarNotaCotizacion,
		asignarCotizacion,
		cambiarEstadoCotizacion,
		convertirCotizacionAPedido,
		eliminarAdjunto,
		eliminarCotizacion
	} from '$lib/remote/cotizaciones.remote';
	import { formatearFecha, formatearFechaHora } from '$lib/utils/fechas';
	import { Paths } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let cotizacion = $derived(data.cotizacion);
	let empleadoSeleccionado = $derived(
		cotizacion.asignado?.id ? String(cotizacion.asignado.id) : ''
	);
	let notaEnRedaccion = $state('');
	let guardandoNota = $state(false);
	let subiendo = $state(false);
	let showEliminar = $state(false);
	let showMotivoRechazo = $state(false);
	let motivoRechazo = $state('');
	let estadoDestinoRechazo = $state<number | null>(null);

	const ACCION_POR_ESTADO: Record<string, string> = {
		asignada: 'asignar',
		en_cotizacion: 'cotizar',
		lista_para_enviar: 'cotizar',
		enviada: 'enviar',
		aprobada: 'aprobar',
		rechazada: 'edit'
	};

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

	async function cambiarEstado(estado_destino_id: number, comentario?: string): Promise<boolean> {
		try {
			await cambiarEstadoCotizacion({
				cotizacion_id: cotizacion.id,
				estado_destino_id,
				comentario
			});
			toast.success('Estado actualizado');
			await invalidateAll();
			return true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Transición no permitida');
			return false;
		}
	}

	function manejarCambioEstado(estado_destino_id: number, slug: string) {
		if (slug === 'rechazada') {
			estadoDestinoRechazo = estado_destino_id;
			motivoRechazo = '';
			showMotivoRechazo = true;
			return;
		}

		void cambiarEstado(estado_destino_id);
	}

	function cerrarModalRechazo() {
		showMotivoRechazo = false;
		motivoRechazo = '';
		estadoDestinoRechazo = null;
	}

	async function confirmarRechazo() {
		const comentario = motivoRechazo.trim();
		if (!comentario || estadoDestinoRechazo === null) return;

		if (await cambiarEstado(estadoDestinoRechazo, comentario)) {
			cerrarModalRechazo();
		}
	}

	async function subirArchivos(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (!input.files?.length) return;
		subiendo = true;
		const archivos = new FormData();
		for (const archivo of input.files) archivos.append('archivos', archivo);
		try {
			const response = await fetch(`/cotizaciones/${cotizacion.id}/adjuntos`, {
				method: 'POST',
				body: archivos
			});
			if (!response.ok) throw new Error();
			toast.success('Archivos adjuntados');
			input.value = '';
			await invalidateAll();
		} catch {
			toast.error('Error al subir archivos');
		} finally {
			subiendo = false;
		}
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
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo generar el pedido');
		}
	}

	function esImagen(mimeType: string | null) {
		return mimeType?.startsWith('image/') ?? false;
	}

	function esAudio(mimeType: string | null) {
		return mimeType?.startsWith('audio/') ?? false;
	}

	function urlAdjunto(adjuntoId: number) {
		return resolve(`/cotizaciones/${cotizacion.id}/adjuntos/${adjuntoId}`);
	}

	async function confirmarEliminar() {
		try {
			await eliminarCotizacion(cotizacion.id);
			toast.success('Cotización eliminada');
			await invalidateAll();
			goto(resolve(Paths.COTIZACIONES));
		} catch {
			toast.error('No se pudo eliminar');
		} finally {
			showEliminar = false;
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
						<button class="btn btn-outline btn-sm btn-success" onclick={generarPedido}>
							Generar Pedido
						</button>
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
					<button class="btn btn-outline btn-error btn-sm" onclick={() => (showEliminar = true)}>
						Eliminar
					</button>
				</Can>
			</div>
		</div>

		<section class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="grid grid-cols-4 gap-4">
					{#if cotizacion.cliente?.id}
						<FormFieldWrapper label="Cliente" id="cliente">
							<p class="font-medium">
								{cotizacion.cliente.nombre}
								{cotizacion.cliente.apellido ?? ''}
								{cotizacion.cliente.razon_social ?? ''} - {cotizacion.cliente.telefono ?? ''}
							</p>
						</FormFieldWrapper>
					{:else}
						<p class="flex flex-col gap-1">
							<span class="font-medium">{cotizacion.cliente_nombre}</span>
							{#if cotizacion.cliente_telefono}<span>{cotizacion.cliente_telefono}</span>{/if}
							<span class="text-base-content/50">No cargado como contacto</span>
						</p>
					{/if}
					<FormFieldWrapper label="Fecha" id="fecha">
						<p>{formatearFecha(cotizacion.created_at)}</p>
					</FormFieldWrapper>
					<FormFieldWrapper label="Estado" id="estado">
						<div class="flex flex-wrap items-center gap-2">
							<span class="badge badge-{cotizacion.estado.color}">{cotizacion.estado.nombre}</span>
							{#if cotizacion.transiciones?.length}
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
									{#each cotizacion.transiciones as transicion (transicion.estado_destino_id)}
										<li>
											<Can
												modulo="cotizaciones"
												accion={ACCION_POR_ESTADO[transicion.destino_slug] ?? 'edit'}
											>
												<button
													onclick={() =>
														manejarCambioEstado(
															transicion.estado_destino_id,
															transicion.destino_slug
														)}
												>
													<span class="badge badge-{transicion.destino_color} badge-xs"></span>
													{transicion.destino_nombre}
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
								{#each data.empleados as empleado (empleado.id)}
									<option value={String(empleado.id)}>
										{empleado.nombre}
										{empleado.apellido ?? ''}
									</option>
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
		</section>

		<Can modulo="cotizaciones" accion="cotizar">
			<CotizacionLineasEditor
				cotizacionId={cotizacion.id}
				bloqueada={!!cotizacion.pedido_id}
				validezInicial={cotizacion.validez_dias ?? 15}
				precioTotalInicial={cotizacion.precio_total}
				incluirIvaInicial={cotizacion.incluir_iva}
				condicionesPagoInicial={cotizacion.condiciones_pago}
				lineasIniciales={data.lineas}
				productos={data.productos}
				insumos={data.insumos}
			/>
		</Can>

		<section class="card bg-base-100 shadow">
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
					{#each data.adjuntos as adjunto (adjunto.id)}
						<div class="card bg-base-100">
							{#if esImagen(adjunto.mime_type)}
								<img
									src={urlAdjunto(adjunto.id)}
									alt={adjunto.nombre_original}
									class="h-40 w-full rounded-t-xl object-cover"
								/>
							{:else if esAudio(adjunto.mime_type)}
								<div class="p-3">
									<audio controls src={urlAdjunto(adjunto.id)} class="w-full"></audio>
								</div>
							{/if}
							<div class="flex items-center justify-between p-2 text-xs">
								<span class="truncate underline">{adjunto.nombre_original}</span>
								<Can modulo="cotizaciones" accion="edit">
									<button
										class="btn btn-ghost text-error btn-xs"
										onclick={async () => {
											await eliminarAdjunto(adjunto.id);
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
		</section>

		<section class="card bg-base-100 shadow">
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
									{nota.autor} ·
									<span class="font-normal text-base-content/60"
										>{formatearFechaHora(nota.fecha)}</span
									>
								</p>
								<p class="mt-1 text-sm whitespace-pre-wrap">{nota.contenido}</p>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="text-sm text-base-content/60">Todavía no hay notas.</p>
				{/if}
			</div>
		</section>

		<section class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title">Historial</h3>
				{#snippet headerHistorial()}
					<th>Fecha</th><th>Estado anterior</th><th>Estado nuevo</th><th>Empleado</th><th
						>Comentario</th
					>
				{/snippet}
				{#snippet rowHistorial(log: (typeof data.historial)[number])}
					<td>{log.fecha ? formatearFecha(new Date(log.fecha)) : '-'}</td>
					<td
						><span class="badge badge-sm badge-{log.estado_anterior?.color || 'ghost'}"
							>{log.estado_anterior?.nombre || '-'}</span
						></td
					>
					<td
						><span class="badge badge-sm badge-{log.estado_nuevo?.color || 'ghost'}"
							>{log.estado_nuevo?.nombre || '-'}</span
						></td
					>
					<td>{log.empleado ?? '-'}</td>
					<td>{log.comentario ?? '-'}</td>
				{/snippet}
				<Table data={data.historial} header={headerHistorial} row={rowHistorial} />
			</div>
		</section>
	</div>
</PageLayout>

<Modal bind:open={showEliminar} title="Eliminar Cotización" onClose={() => (showEliminar = false)}>
	<p>¿Eliminar la cotización <strong>{cotizacion.numero_cotizacion}</strong>?</p>
	{#snippet actions()}
		<button class="btn" onclick={() => (showEliminar = false)}>Cancelar</button>
		<button class="btn btn-error" onclick={confirmarEliminar}>Eliminar</button>
	{/snippet}
</Modal>

<Modal bind:open={showMotivoRechazo} title="Motivo del rechazo" onClose={cerrarModalRechazo}>
	<label class="fieldset w-full py-4">
		<span class="fieldset-legend">Motivo</span>
		<textarea
			class="textarea w-full resize-none"
			rows="3"
			maxlength="5000"
			required
			bind:value={motivoRechazo}
			placeholder="Describí por qué se rechaza la cotización..."
		></textarea>
	</label>
	{#snippet actions()}
		<button class="btn" onclick={cerrarModalRechazo}>Cancelar</button>
		<button class="btn btn-error" disabled={!motivoRechazo.trim()} onclick={confirmarRechazo}>
			Rechazar cotización
		</button>
	{/snippet}
</Modal>
