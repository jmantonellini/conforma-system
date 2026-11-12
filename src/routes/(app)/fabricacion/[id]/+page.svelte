<script lang="ts">
	import AtributosResumen from '$lib/modulos/productos/componentes/AtributosResumen.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { page } from '$app/state';
	import {
		cambiarEstadoUnidad,
		reanudarUnidad,
		eliminarOrdenFabricacion
	} from '$lib/modulos/fabricacion/fabricacion.remote';
	import {
		getEstadosFabricacion,
		getOrdenFabricacion,
		getHistorialUnidades
	} from '$lib/modulos/fabricacion/fabricacion-consultas.remote';
	import {
		EncabezadoDetalle,
		EstadoBadge,
		FormFieldWrapper,
		Historial,
		Icono,
		Modal,
		PageLayout,
		Seccion,
		Table
	} from '$lib/ui';
	import ArchivosAdjuntos from '$lib/modulos/adjuntos/componentes/ArchivosAdjuntos.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatearFecha } from '$lib/utils/fechas';
	import type { MaterialSnapshot } from '$lib/modulos/ventas/tipos';
	import { ESTADO_FABRICACION, ETIQUETA_PRIORIDAD } from '$lib/modulos/fabricacion/tipos';
	import { getEmpleadosOpciones } from '$lib/modulos/configuracion/empleados.remote';
	import { consumirRecetaOrden, getMovimientosInsumos } from '$lib/modulos/insumos/insumos.remote';
	import { can } from '$lib/utils/permissions';
	import InsumosMovimientosTabla from '$lib/modulos/insumos/componentes/InsumosMovimientosTabla.svelte';

	let { params } = $props();
	const id = $derived(Number(params.id));
	const orden = $derived(await getOrdenFabricacion(id));
	const historial = $derived(await getHistorialUnidades(id));
	const estados = $derived(await getEstadosFabricacion());

	const puedeVerMovimientos = can(page.data.user, page.data.permisos, 'insumos', 'view');
	const puedeEditarInsumos = can(page.data.user, page.data.permisos, 'insumos', 'edit');
	const empleados = $derived(puedeEditarInsumos ? await getEmpleadosOpciones() : []);
	const movimientos = $derived(
		puedeVerMovimientos ? await getMovimientosInsumos({ orden_id: id, limit: 100 }) : []
	);
	const recetaConsumida = $derived(movimientos.some((m) => m.fuente === 'receta'));
	const listasInsumos = $derived([
		{ titulo: 'Insumos requeridos', items: orden.insumos_requeridos as MaterialSnapshot[] },
		{ titulo: 'Adicionales del pedido', items: orden.insumos_adicionales as MaterialSnapshot[] }
	]);

	let ocupado = $state(false);
	let empleadoReceta = $state('');
	let unidadAPausar = $state<{ id: number; estadoId: number } | null>(null);
	let motivoPausa = $state('');

	async function ejecutar(accion: () => Promise<unknown>, exito: string) {
		if (ocupado) return;
		ocupado = true;
		try {
			await accion();
			toast.success(exito);
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo completar la acción'));
		} finally {
			ocupado = false;
		}
	}

	const cambiarEstado = (unidadId: number, estadoId: number, comentario?: string) =>
		ejecutar(
			() =>
				cambiarEstadoUnidad({
					unidad_id: String(unidadId),
					estado_destino_id: String(estadoId),
					comentario
				}),
			'Estado actualizado'
		);

	async function confirmarPausa() {
		if (!unidadAPausar) return;
		await cambiarEstado(unidadAPausar.id, unidadAPausar.estadoId, motivoPausa.trim());
		unidadAPausar = null;
		motivoPausa = '';
	}

	async function eliminar() {
		await eliminarOrdenFabricacion(String(orden.id));
		toast.success('Orden eliminada');
		goto(resolve('/fabricacion'));
	}
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo="OF-{orden.id}"
		subtitulo={orden.nombre_trabajo}
		volver={{ href: '/fabricacion', etiqueta: 'Fabricación' }}
		estado={orden.estado}
		{estados}
		actual="fabricacion"
		proceso={{ cotizacion: orden.navegacion.cotizacion_id, pedido: orden.navegacion.pedido_id }}
		eliminar={{
			modulo: 'fabricacion',
			mensaje: `¿Eliminar la orden OF-${orden.id} y sus unidades? Esta acción no se puede deshacer.`,
			onConfirmar: eliminar
		}}
	>
		{#snippet acciones()}
			<a
				class="btn btn-sm"
				href={resolve(`/fabricacion/${orden.id}/pdf`)}
				target="_blank"
				rel="noreferrer"><Icono nombre="imprimir" /> Imprimir</a
			>
		{/snippet}
	</EncabezadoDetalle>

	<Seccion>
		<dl class="datos">
			<div>
				<dt>Progreso</dt>
				<dd class="flex items-center gap-2">
					<progress
						class="progress w-24 progress-primary"
						value={orden.cantidad_producida}
						max={orden.cantidad_total}
					></progress>
					<span class="tabular-nums">{orden.cantidad_producida}/{orden.cantidad_total}</span>
				</dd>
			</div>
			<div>
				<dt>Cliente</dt>
				<dd>{orden.es_para_stock ? 'Stock interno' : (orden.cliente_nombre ?? '-')}</dd>
			</div>
			<div>
				<dt>Prioridad</dt>
				<dd><EstadoBadge estado={ETIQUETA_PRIORIDAD[orden.prioridad ?? 0]} /></dd>
			</div>
			<div>
				<dt>Asignado a</dt>
				<dd>
					{orden.empleado ? `${orden.empleado.nombre} ${orden.empleado.apellido}` : 'Sin asignar'}
				</dd>
			</div>
			<div>
				<dt>Entrega estimada</dt>
				<dd>{formatearFecha(orden.fecha_fin_estimada)}</dd>
			</div>
		</dl>
	</Seccion>

	<Seccion titulo="Unidades"
		><Table data={orden.unidades}>
			{#snippet header()}
				<th>N° serie</th>
				<th>Estado</th>
				<th>Comentario</th>
				<th class="text-right">Mover a</th>
			{/snippet}
			{#snippet row(unidad: (typeof orden.unidades)[number])}
				<td class="font-mono">{unidad.numero_serie}</td>
				<td><EstadoBadge class="badge-sm" estado={unidad.estado} /></td>
				<td class="text-sm text-base-content/70">{unidad.comentario_estado ?? ''}</td>
				<td>
					<div class="flex flex-wrap justify-end gap-1">
						{#if unidad.esta_pausada}
							<button
								class="btn btn-xs"
								disabled={ocupado}
								onclick={() =>
									ejecutar(
										() => reanudarUnidad({ unidad_id: String(unidad.id) }),
										'Unidad reanudada'
									)}>Reanudar</button
							>
						{:else}
							{#each unidad.transiciones_disponibles as destino (destino.id)}
								<button
									class={[
										'btn btn-xs',
										destino.orden > unidad.estado.orden &&
										destino.slug !== ESTADO_FABRICACION.PAUSADO
											? 'btn-soft btn-primary'
											: 'btn-ghost'
									]}
									disabled={ocupado}
									onclick={() =>
										destino.slug === ESTADO_FABRICACION.PAUSADO
											? (unidadAPausar = { id: unidad.id, estadoId: destino.id })
											: cambiarEstado(unidad.id, destino.id)}>{destino.nombre}</button
								>
							{/each}
						{/if}
					</div>
				</td>
			{/snippet}
		</Table>
	</Seccion>

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
		<div class="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-2">
			<Seccion
				titulo="Información para fabricar"
				descripcion={[orden.producto?.codigo, orden.producto?.nombre ?? orden.descripcion_producto]
					.filter(Boolean)
					.join(' · ') || 'Trabajo personalizado'}
			>
				{#snippet acciones()}
					{#if orden.producto}
						<a class="btn btn-sm" href={resolve(`/productos/${orden.producto.id}`)}>Ver producto</a>
					{/if}
				{/snippet}
				<AtributosResumen grupos={orden.atributos} />
				{#if orden.producto?.notas_fabricacion}
					<p class="rounded-box bg-base-200/60 p-3 text-sm whitespace-pre-line">
						{orden.producto.notas_fabricacion}
					</p>
				{/if}
				{#each listasInsumos as lista (lista.titulo)}
					{#if lista.items.length}
						<div>
							<h3 class="mb-1 text-sm font-medium text-base-content/60">{lista.titulo}</h3>
							<ul class="list rounded-box border border-base-300">
								{#each lista.items as insumo, indice (indice)}
									<li class="list-row py-2">
										<span class="font-mono text-xs text-base-content/60"
											>{insumo.codigo ?? '—'}</span
										>
										<span>{insumo.nombre}</span>
										<span class="numero font-medium">{insumo.cantidad} {insumo.unidad ?? ''}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</Seccion>

			{#if puedeVerMovimientos}
				<Seccion titulo="Consumo de insumos">
					{#snippet acciones()}
						{#if puedeEditarInsumos}
							<div class="join">
								<select class="select join-item select-sm" bind:value={empleadoReceta}>
									<option value="">Responsable...</option>
									{#each empleados as empleado (empleado.id)}
										<option value={String(empleado.id)}
											>{empleado.nombre} {empleado.apellido}</option
										>
									{/each}
								</select>
								<button
									class="btn join-item btn-sm"
									disabled={ocupado ||
										!empleadoReceta ||
										recetaConsumida ||
										!orden.insumos_requeridos.length}
									onclick={() =>
										ejecutar(async () => {
											await consumirRecetaOrden({
												orden_id: orden.id,
												empleado_id: Number(empleadoReceta)
											});
											await invalidateAll();
										}, 'Consumo de receta registrado')}
								>
									{recetaConsumida ? 'Receta consumida' : 'Consumir receta'}
								</button>
							</div>
							<a
								class="btn btn-primary btn-sm"
								href={resolve(`/insumos/movimientos?orden=${orden.id}`)}>Registrar consumo real</a
							>
						{/if}
					{/snippet}
					<InsumosMovimientosTabla {movimientos} emptyMessage="Sin consumos registrados" />
				</Seccion>
			{/if}
		</div>

		<div class="flex min-w-0 flex-col gap-4 sm:gap-6">
			<ArchivosAdjuntos tipo="fabricacion" entidadId={orden.id} adjuntos={orden.adjuntos} />
			<Seccion titulo="Historial">
				<Historial eventos={historial} />
			</Seccion>
		</div>
	</div>
</PageLayout>

<Modal
	open={unidadAPausar !== null}
	titulo="Pausar unidad"
	descripcion="El motivo queda registrado en el historial de la orden."
	alCerrar={() => (unidadAPausar = null)}
	accion={{ etiqueta: 'Pausar', pendiente: ocupado, onclick: confirmarPausa }}
>
	<FormFieldWrapper id="motivo-pausa" label="Motivo">
		<textarea
			id="motivo-pausa"
			class="textarea"
			rows="3"
			bind:value={motivoPausa}
			placeholder="Ej.: falta de material"
		></textarea>
	</FormFieldWrapper>
</Modal>
