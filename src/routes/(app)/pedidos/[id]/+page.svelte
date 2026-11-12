<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Can, EncabezadoDetalle, Historial, PageLayout, Seccion, Table } from '$lib/ui';
	import type { Transicion } from '$lib/ui/EncabezadoDetalle.svelte';
	import {
		cambiarEstadoPedido,
		eliminarPedido,
		getEstadosPedido,
		getHistorialPedido,
		getPedidoById
	} from '$lib/modulos/pedidos/pedidos.remote';
	import { confirmar as confirmarCambio } from '$lib/ui/confirmar.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { PEDIDO_SLUG } from '$lib/modulos/pedidos/tipos';
	import { ESTADO_RESERVA } from '$lib/modulos/stock/tipos';
	import { formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda } from '$lib/utils/precios';
	import { can } from '$lib/utils/permissions';
	import PedidoEnvios from './PedidoEnvios.svelte';
	import PedidoPagos from './PedidoPagos.svelte';
	import ArchivosAdjuntos from '$lib/modulos/adjuntos/componentes/ArchivosAdjuntos.svelte';

	const id = $derived(Number(page.params.id));
	const { pedido, lineas, insumosAdicionales, adjuntos } = $derived(await getPedidoById(id));
	const historial = $derived(await getHistorialPedido(id));
	const estados = $derived(await getEstadosPedido());
	const veImportes = can(page.data.user, page.data.permisos, 'importes', 'view');
	const contacto = $derived(
		[pedido.cliente?.nombre, pedido.cliente?.apellido].filter(Boolean).join(' ')
	);

	const ETIQUETA_RESERVA = {
		[ESTADO_RESERVA.CONSUMIDA]: 'Despachado desde stock',
		[ESTADO_RESERVA.LIBERADA]: 'Reserva liberada'
	} as Record<string, string>;

	async function moverPedido({ estado_destino_id, destino_nombre, destino_slug }: Transicion) {
		const confirmar =
			destino_slug === PEDIDO_SLUG.CANCELADO || destino_slug === PEDIDO_SLUG.DEMORADO;
		if (
			confirmar &&
			!(await confirmarCambio({
				titulo: `Pasar a ${destino_nombre}`,
				mensaje: `¿Confirmás el cambio del pedido ${pedido.numero_pedido} a "${destino_nombre}"?`,
				accion: destino_nombre,
				peligro: destino_slug === PEDIDO_SLUG.CANCELADO
			}))
		)
			return;
		try {
			await cambiarEstadoPedido({
				pedido_id: String(pedido.id),
				estado_destino_id: String(estado_destino_id)
			});
			toast.success(`Pedido ${destino_nombre.toLowerCase()}`);
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo cambiar el estado'));
		}
	}

	async function eliminar() {
		await eliminarPedido(pedido.id);
		toast.success('Pedido eliminado');
		goto(resolve('/pedidos'));
	}
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo="Pedido {pedido.numero_pedido}"
		subtitulo={pedido.cliente?.razon_social}
		volver={{ href: '/pedidos', etiqueta: 'Pedidos' }}
		estado={pedido.estado}
		transiciones={pedido.transiciones}
		onTransicion={moverPedido}
		puedeTransicionar={() => can(page.data.user, page.data.permisos, 'pedidos', 'edit')}
		{estados}
		actual="pedido"
		proceso={{
			cotizacion: pedido.navegacion.cotizacion_id,
			fabricacion: pedido.navegacion.orden_fabricacion_id
		}}
		eliminar={{
			modulo: 'pedidos',
			mensaje: `¿Eliminar el pedido ${pedido.numero_pedido}? Esta acción no se puede deshacer.`,
			onConfirmar: eliminar
		}}
	/>

	<Seccion>
		<dl class="datos">
			<div>
				<dt>Cliente</dt>
				<dd>{pedido.cliente?.razon_social ?? '-'}</dd>
			</div>
			{#if contacto}<div>
					<dt>Contacto</dt>
					<dd>{contacto}</dd>
				</div>{/if}
			<div>
				<dt>Fecha</dt>
				<dd>{formatearFecha(pedido.fecha)}</dd>
			</div>
			{#if veImportes}
				<div>
					<dt>Total</dt>
					<dd class="font-semibold">{formatearMoneda(pedido.total)}</dd>
				</div>
				<div>
					<dt>Anticipo</dt>
					<dd>{formatearMoneda(pedido.anticipo)}</dd>
				</div>
			{/if}
			{#if pedido.observaciones}
				<div class="col-span-full">
					<dt>Observaciones</dt>
					<dd class="whitespace-pre-wrap">{pedido.observaciones}</dd>
				</div>
			{/if}
		</dl>
	</Seccion>

	<Seccion titulo="Productos"
		><Table data={lineas}>
			{#snippet header()}
				<th>Producto</th>
				<th class="numero">Cant.</th>
				{#if veImportes}
					<th class="numero">Costo</th>
					<th class="numero">Precio lista</th>
					<th class="numero">Precio neto</th>
					<th class="numero">Subtotal</th>
				{/if}
				<th>Fabricación</th>
			{/snippet}
			{#snippet row(linea: (typeof lineas)[number])}
				<td>
					<p>{linea.producto_nombre || linea.descripcion_personalizada || '-'}</p>
					<p class="font-mono text-xs text-base-content/60">
						{linea.es_personalizado ? 'Personalizado' : linea.producto_codigo}
					</p>
				</td>
				<td class="numero">{linea.cantidad}</td>
				{#if veImportes}
					<td class="numero">{formatearMoneda(linea.costo_materiales)}</td>
					<td class="numero">{formatearMoneda(linea.precio_lista_unitario)}</td>
					<td class="numero">{formatearMoneda(linea.precio_unitario)}</td>
					<td class="numero font-medium">{formatearMoneda(linea.subtotal)}</td>
				{/if}
				<td>
					{#if linea.reserva_stock}
						<span class="badge badge-soft badge-sm badge-info">
							{ETIQUETA_RESERVA[linea.reserva_stock.estado] ??
								`Reservado · ${linea.reserva_stock.ubicacion_nombre}`}
						</span>
					{:else if linea.produccion}
						{@const p = linea.produccion}
						<a
							href={resolve(`/fabricacion/${p.orden_id}`)}
							class={['badge badge-soft badge-sm', p.es_final ? 'badge-success' : 'badge-warning']}
						>
							OF-{p.orden_id} · {p.terminadas}/{p.total}
						</a>
					{:else}
						<Can modulo="fabricacion" accion="create">
							<a class="btn btn-xs" href={resolve(`/fabricacion/crear?linea=${linea.id}`)}>
								Pasar a fabricación
							</a>
						</Can>
					{/if}
				</td>
			{/snippet}
			{#snippet footer()}
				{#if veImportes}
					<th colspan="5" class="numero">Total</th>
					<th class="numero text-base text-base-content">{formatearMoneda(pedido.total)}</th>
					<th></th>
				{/if}
			{/snippet}
		</Table>
	</Seccion>

	{#if insumosAdicionales.length}
		<Seccion titulo="Insumos adicionales">
			<Table data={insumosAdicionales}>
				{#snippet header()}
					<th>Insumo</th>
					<th class="numero">Cantidad</th>
					{#if veImportes}
						<th class="numero">Costo</th>
						<th class="numero">Precio lista</th>
						<th class="numero">Precio neto</th>
					{/if}
				{/snippet}
				{#snippet row(insumo: (typeof insumosAdicionales)[number])}
					<td>
						<p>{insumo.nombre}</p>
						<p class="font-mono text-xs text-base-content/60">{insumo.codigo}</p>
					</td>
					<td class="numero">{insumo.cantidad} {insumo.unidad}</td>
					{#if veImportes}
						<td class="numero">{formatearMoneda(insumo.costo_unitario)}</td>
						<td class="numero">{formatearMoneda(insumo.precio_lista_unitario)}</td>
						<td class="numero">{formatearMoneda(insumo.precio_unitario)}</td>
					{/if}
				{/snippet}
			</Table>
		</Seccion>
	{/if}

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
		<div class="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-2">
			<ArchivosAdjuntos tipo="pedido" entidadId={pedido.id} {adjuntos} />
		</div>

		<div class="flex min-w-0 flex-col gap-4 sm:gap-6">
			{#if veImportes}<PedidoPagos pedidoId={pedido.id} />{/if}
			<PedidoEnvios pedidoId={pedido.id} />
			<Seccion titulo="Historial">
				<Historial eventos={historial} />
			</Seccion>
		</div>
	</div>
</PageLayout>
