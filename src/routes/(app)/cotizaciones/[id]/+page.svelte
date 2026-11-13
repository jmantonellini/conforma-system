<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		Can,
		EncabezadoDetalle,
		FormFieldWrapper,
		Historial,
		MenuDesplegable,
		Modal,
		PageLayout,
		Persona,
		Seccion
	} from '$lib/ui';
	import type { Transicion } from '$lib/ui/EncabezadoDetalle.svelte';
	import CotizacionLineasEditor from '$lib/modulos/cotizaciones/componentes/CotizacionLineasEditor.svelte';
	import ArchivosAdjuntos from '$lib/modulos/adjuntos/componentes/ArchivosAdjuntos.svelte';
	import { Document } from '$lib/ui/icons';
	import { toast } from '$lib/ui/toast.svelte';
	import CambiarMonedaDialog from '$lib/modulos/ventas/componentes/CambiarMonedaDialog.svelte';
	import { NOMBRE_MONEDA } from '$lib/utils/moneda';
	import { formatearDosDecimales } from '$lib/utils/precios';
	import {
		agregarNotaCotizacion,
		asignarCotizacion,
		cambiarEstadoCotizacion,
		cambiarMonedaCotizacion,
		convertirCotizacionAPedido,
		eliminarCotizacion
	} from '$lib/modulos/cotizaciones/cotizaciones.remote';
	import { CANALES_COTIZACION } from '$lib/modulos/cotizaciones/canales';
	import { formatearFecha } from '$lib/utils/fechas';
	import { can } from '$lib/utils/permissions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const cotizacion = $derived(data.cotizacion);
	const puede = (accion: string) => can(page.data.user, page.data.permisos, 'cotizaciones', accion);
	const veImportes = can(page.data.user, page.data.permisos, 'importes', 'view');
	const cliente = $derived(cotizacion.cliente);
	const notas = $derived(data.notas.map((nota) => ({ ...nota, detalle: nota.contenido })));

	let dialogoMoneda = $state<CambiarMonedaDialog>();
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
		puedeTransicionar={() => puede('edit')}
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
				<Can modulo="pedidos" accion="create">
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
			{#if veImportes}
				<div>
					<dt>Moneda</dt>
					<dd class="flex items-center gap-2">
						<span>
							{NOMBRE_MONEDA[cotizacion.moneda]} ({cotizacion.moneda})
							{#if cotizacion.tipo_cambio}
								<span class="block text-sm text-base-content/60">
									US$ 1 = $ {formatearDosDecimales(cotizacion.tipo_cambio)}
								</span>
							{/if}
						</span>
						{#if puede('edit') && !cotizacion.pedido_id}
							<button class="btn btn-ghost btn-xs" onclick={() => dialogoMoneda?.abrir()}>
								Cambiar
							</button>
						{/if}
					</dd>
				</div>
			{/if}
			<div>
				<dt>Asignada a</dt>
				<dd class="flex items-center gap-2">
					<Persona
						nombre={cotizacion.asignado?.nombre}
						apellido={cotizacion.asignado?.apellido}
						vacio="Sin asignar"
					/>
					{#if puede('edit')}
						<MenuDesplegable class="btn btn-ghost btn-xs" titulo="Cambiar responsable">
							{#snippet etiqueta()}{cotizacion.asignado ? 'Cambiar' : 'Asignar'}{/snippet}
							<li class="menu-title">Asignar a</li>
							{#each data.empleados as empleado (empleado.id)}
								<li>
									<button
										disabled={ocupado}
										class={[empleado.id === cotizacion.asignado?.id && 'menu-active']}
										onclick={() =>
											ejecutar(
												() =>
													asignarCotizacion({
														cotizacion_id: cotizacion.id,
														empleado_id: empleado.id
													}),
												`Asignada a ${empleado.nombre}`
											)}
									>
										{empleado.nombre}
										{empleado.apellido ?? ''}
									</button>
								</li>
							{/each}
						</MenuDesplegable>
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
		<Can modulo="cotizaciones" accion="edit">
			{#key `${cotizacion.moneda}-${cotizacion.tipo_cambio}`}
				<CotizacionLineasEditor
					cotizacionId={cotizacion.id}
					bloqueada={!!cotizacion.pedido_id}
					moneda={cotizacion.moneda}
					tipoCambio={cotizacion.tipo_cambio}
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
			{/key}
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
							bind:value={nota}></textarea>
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

{#if veImportes}
	<CambiarMonedaDialog
		bind:this={dialogoMoneda}
		moneda={cotizacion.moneda}
		tipoCambio={cotizacion.tipo_cambio}
		total={cotizacion.precio_total}
		onConfirmar={async (cambio) => {
			await cambiarMonedaCotizacion({ id: cotizacion.id, ...cambio });
			await invalidateAll();
		}}
	/>
{/if}

<Modal
	open={rechazo !== null}
	titulo="Rechazar cotización"
	descripcion="El motivo queda registrado en el historial."
	alCerrar={() => (rechazo = null)}
	accion={{
		etiqueta: 'Rechazar cotización',
		peligro: true,
		pendiente: ocupado,
		deshabilitada: !rechazo?.motivo.trim(),
		onclick: confirmarRechazo
	}}
>
	{#if rechazo}
		<FormFieldWrapper id="motivo-rechazo" label="Motivo" required>
			<textarea
				id="motivo-rechazo"
				class="textarea"
				rows="3"
				maxlength="5000"
				bind:value={rechazo.motivo}
				placeholder="Ej.: el cliente consiguió mejor precio"></textarea>
		</FormFieldWrapper>
	{/if}
</Modal>
