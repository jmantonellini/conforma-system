<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		Can,
		EncabezadoDetalle,
		Historial,
		MenuDesplegable,
		Modal,
		PageLayout,
		Seccion
	} from '$lib/components/ui';
	import type { Transicion } from '$lib/components/ui/EncabezadoDetalle.svelte';
	import CotizacionLineasEditor from '$lib/components/cotizaciones/CotizacionLineasEditor.svelte';
	import ArchivosAdjuntos from '$lib/components/ArchivosAdjuntos.svelte';
	import { Document } from '$lib/components/ui/icons';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		agregarNotaCotizacion,
		asignarCotizacion,
		cambiarEstadoCotizacion,
		convertirCotizacionAPedido,
		eliminarCotizacion
	} from '$lib/remote/cotizaciones.remote';
	import { CANALES_COTIZACION } from '$lib/utils/canales-cotizacion';
	import { formatearFecha } from '$lib/utils/fechas';
	import { can } from '$lib/utils/permissions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const cotizacion = $derived(data.cotizacion);
	const puede = (accion: string) => can(page.data.user, page.data.permisos, 'cotizaciones', accion);
	const veImportes = can(page.data.user, page.data.permisos, 'importes', 'view');
	const cliente = $derived(cotizacion.cliente);
	const notas = $derived(data.notas.map((nota) => ({ ...nota, detalle: nota.contenido })));

	const ACCION_POR_ESTADO: Record<string, string> = {
		asignada: 'asignar',
		en_cotizacion: 'cotizar',
		lista_para_enviar: 'cotizar',
		enviada: 'enviar',
		aprobada: 'aprobar'
	};

	let empleadoSeleccionado = $derived(
		cotizacion.asignado?.id ? String(cotizacion.asignado.id) : ''
	);
	let nota = $state('');
	let rechazo = $state<{ estadoId: number; motivo: string } | null>(null);
	let ocupado = $state(false);

	async function ejecutar(accion: () => Promise<unknown>, exito: string) {
		ocupado = true;
		try {
			await accion();
			toast.success(exito);
			await invalidateAll();
			return true;
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo completar la acción'));
			return false;
		} finally {
			ocupado = false;
		}
	}

	const cambiarEstado = (estado_destino_id: number, comentario?: string) =>
		ejecutar(
			() =>
				cambiarEstadoCotizacion({ cotizacion_id: cotizacion.id, estado_destino_id, comentario }),
			'Estado actualizado'
		);

	function manejarTransicion({ estado_destino_id, destino_slug }: Transicion) {
		if (destino_slug === 'rechazada') rechazo = { estadoId: estado_destino_id, motivo: '' };
		else void cambiarEstado(estado_destino_id);
	}

	async function confirmarRechazo() {
		if (rechazo && (await cambiarEstado(rechazo.estadoId, rechazo.motivo.trim()))) rechazo = null;
	}

	async function generarPedido() {
		try {
			const { pedidoId } = await convertirCotizacionAPedido(cotizacion.id);
			toast.success('Pedido generado');
			goto(resolve(`/pedidos/${pedidoId}`));
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo generar el pedido'));
		}
	}

	async function eliminar() {
		await eliminarCotizacion(cotizacion.id);
		toast.success('Cotización eliminada');
		goto(resolve('/cotizaciones'));
	}
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo="Cotización {cotizacion.numero_cotizacion}"
		subtitulo={cliente?.razon_social}
		volver={{ href: '/cotizaciones', etiqueta: 'Cotizaciones' }}
		estado={cotizacion.estado}
		transiciones={cotizacion.pedido_id ? [] : cotizacion.transiciones}
		onTransicion={manejarTransicion}
		puedeTransicionar={(slug) => puede(ACCION_POR_ESTADO[slug] ?? 'edit')}
		estados={data.estados}
		actual="cotizacion"
		proceso={{
			pedido: cotizacion.navegacion.pedido_id,
			fabricacion: cotizacion.navegacion.orden_fabricacion_id
		}}
		eliminar={{
			modulo: 'cotizaciones',
			mensaje: `¿Eliminar la cotización ${cotizacion.numero_cotizacion}? Esta acción no se puede deshacer.`,
			onConfirmar: eliminar
		}}
	>
		{#snippet acciones()}
			{#if cotizacion.estado.slug === 'aprobada' && !cotizacion.pedido_id}
				<Can modulo="cotizaciones" accion="convertir">
					<button class="btn btn-primary btn-sm" onclick={generarPedido}>Generar pedido</button>
				</Can>
			{/if}
			{#if veImportes}
				<MenuDesplegable alFinal>
					{#snippet etiqueta()}<Document /> PDF{/snippet}
					{#each [['USD', 'Dólares (USD)'], ['ARS', 'Pesos (ARS)']] as [moneda, nombre] (moneda)}
						<li>
							<a
								href={resolve(`/cotizaciones/${cotizacion.id}/pdf?moneda=${moneda}`)}
								target="_blank"
								rel="noreferrer">{nombre}</a
							>
						</li>
					{/each}
				</MenuDesplegable>
			{/if}
		{/snippet}
	</EncabezadoDetalle>

	<Seccion>
		<dl class="datos">
			<div>
				<dt>Cliente</dt>
				<dd>
					{cliente?.razon_social ?? 'Contacto no disponible'}
					{#if cliente?.nombre || cliente?.apellido}
						<span class="block text-sm text-base-content/60">
							{[cliente.nombre, cliente.apellido].filter(Boolean).join(' ')}
						</span>
					{/if}
				</dd>
			</div>
			<div>
				<dt>Contacto</dt>
				<dd>
					{cliente?.telefono || '-'}
					{#if cliente?.email}<span class="block text-sm text-base-content/60">{cliente.email}</span
						>{/if}
				</dd>
			</div>
			<div>
				<dt>Canal</dt>
				<dd>{CANALES_COTIZACION[cotizacion.canal] ?? cotizacion.canal}</dd>
			</div>
			<div>
				<dt>Fecha</dt>
				<dd>{formatearFecha(cotizacion.created_at)}</dd>
			</div>
			<div>
				<dt>Asignada a</dt>
				<dd>
					{#if puede('asignar')}
						<div class="join w-full">
							<select class="select join-item select-sm" bind:value={empleadoSeleccionado}>
								<option value="">Sin asignar</option>
								{#each data.empleados as empleado (empleado.id)}
									<option value={String(empleado.id)}>
										{empleado.nombre}
										{empleado.apellido ?? ''}
									</option>
								{/each}
							</select>
							<button
								class="btn join-item btn-sm"
								disabled={ocupado || !empleadoSeleccionado}
								onclick={() =>
									ejecutar(
										() =>
											asignarCotizacion({
												cotizacion_id: cotizacion.id,
												empleado_id: Number(empleadoSeleccionado)
											}),
										'Cotización asignada'
									)}>Asignar</button
							>
						</div>
					{:else}
						{cotizacion.asignado?.nombre ?? 'Sin asignar'}
					{/if}
				</dd>
			</div>
			<div class="col-span-full">
				<dt>Consulta</dt>
				<dd class="whitespace-pre-wrap">{cotizacion.descripcion}</dd>
			</div>
			{#if cotizacion.observaciones}
				<div class="col-span-full">
					<dt>Observaciones internas</dt>
					<dd class="whitespace-pre-wrap">{cotizacion.observaciones}</dd>
				</div>
			{/if}
		</dl>
	</Seccion>

	{#if veImportes}
		<Can modulo="cotizaciones" accion="cotizar">
			<CotizacionLineasEditor
				cotizacionId={cotizacion.id}
				bloqueada={!!cotizacion.pedido_id}
				validezInicial={cotizacion.validez_dias ?? 15}
				precioTotalInicial={cotizacion.precio_total}
				descuentoGlobalInicial={cotizacion.descuento_global_porcentaje ?? 0}
				incluirIvaInicial={cotizacion.incluir_iva}
				condicionesPagoInicial={cotizacion.condiciones_pago}
				lineasIniciales={data.lineas.map((linea) => ({
					...linea,
					precio_unitario: linea.precio_unitario ?? 0,
					precio_lista_unitario: linea.precio_lista_unitario ?? 0,
					costo_materiales: linea.costo_materiales ?? 0
				}))}
				productos={data.productos}
				insumos={data.insumos}
				tiposInsumo={data.tiposInsumo}
				categoriasInsumo={data.categoriasInsumo}
				unidadesInsumo={data.unidadesInsumo}
			/>
		</Can>
	{/if}

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
		<div class="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-2">
			<ArchivosAdjuntos tipo="cotizacion" entidadId={cotizacion.id} adjuntos={data.adjuntos} />
			<Seccion titulo="Seguimiento interno">
				{#if puede('edit')}
					<div class="flex flex-col gap-2">
						<textarea
							class="textarea w-full"
							rows="2"
							maxlength="5000"
							placeholder="Novedades del cliente, acuerdos o cambios solicitados..."
							bind:value={nota}
						></textarea>
						<button
							class="btn self-end btn-sm"
							disabled={ocupado || !nota.trim()}
							onclick={() =>
								ejecutar(async () => {
									await agregarNotaCotizacion({ cotizacion_id: cotizacion.id, contenido: nota });
									nota = '';
								}, 'Nota agregada')}>Agregar nota</button
						>
					</div>
				{/if}
				<Historial eventos={notas} vacio="Todavía no hay notas." />
			</Seccion>
		</div>
		<Seccion titulo="Historial">
			<Historial eventos={data.historial} />
		</Seccion>
	</div>
</PageLayout>

<Modal open={rechazo !== null} title="Motivo del rechazo" onClose={() => (rechazo = null)}>
	{#if rechazo}
		<textarea
			class="textarea w-full"
			rows="3"
			maxlength="5000"
			bind:value={rechazo.motivo}
			placeholder="Describí por qué se rechaza la cotización..."
		></textarea>
	{/if}
	{#snippet actions()}
		<button class="btn" onclick={() => (rechazo = null)}>Cancelar</button>
		<button
			class="btn btn-error"
			disabled={ocupado || !rechazo?.motivo.trim()}
			onclick={confirmarRechazo}>Rechazar cotización</button
		>
	{/snippet}
</Modal>
