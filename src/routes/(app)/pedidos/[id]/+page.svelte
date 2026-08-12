<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import {
		cambiarEstadoPedido,
		eliminarPedido,
		getHistorialPedido,
		getPedidoById
	} from '$lib/remote/pedidos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';
	import { formatearFecha } from '$lib/utils/fechas';
	import PedidoEnvios from './PedidoEnvios.svelte';
	import PedidoPagos from './PedidoPagos.svelte';

	let { pedido, lineas } = $derived(await getPedidoById(parseInt(page.params.id ?? '')));

	function irAFabricacion(lineaId: number) {
		goto(resolve(`/fabricacion/crear?linea=${lineaId}`));
	}

	function irADetalleOrden(ordenId: number | null) {
		if (ordenId) goto(resolve(`/fabricacion/${ordenId}`));
	}

	async function moverPedido(destinoId: number, nombre: string) {
		const confirmar = nombre === 'Cancelado' || nombre === 'Demorado';
		if (confirmar && !confirm(`¿Cambiar a "${nombre}"?`)) return;

		try {
			await cambiarEstadoPedido({
				pedido_id: String(pedido.id),
				estado_destino_id: String(destinoId)
			});
			toast.success(`Pedido ${nombre.toLowerCase()}`);
		} catch (e) {
			console.log(e);
			toast.error('No se pudo cambiar el estado');
		}
	}

	let showEliminar = $state(false);

	function abrirEliminar() {
		showEliminar = true;
	}

	function cerrarModal() {
		showEliminar = false;
	}

	async function confirmarEliminar() {
		if (!pedido) return;
		try {
			await eliminarPedido(pedido.id);
			toast.success('Pedido eliminado');
			goto(resolve(Paths.PEDIDOS));
		} catch (e) {
			console.log(e);
			toast.error('No se pudo eliminar');
		} finally {
			cerrarModal();
		}
	}
</script>

<PageLayout>
	{#if pedido}
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>
				<button class="btn btn-outline btn-error btn-sm" onclick={abrirEliminar}> Eliminar </button>
			</div>

			<!-- Datos del pedido -->
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<div class="grid grid-cols-4 gap-4">
						<FormFieldWrapper label="Cliente" id="cliente">
							<p class="font-semibold">
								{pedido.cliente?.nombre + ' ' + (pedido.cliente?.apellido || '') || '-'}
								{#if pedido.cliente?.razon_social}
									({pedido.cliente?.razon_social})
								{/if}
							</p>
						</FormFieldWrapper>
						<FormFieldWrapper label="Fecha" id="fecha">
							<p>{formatearFecha(new Date(pedido.fecha))}</p>
						</FormFieldWrapper>
						<FormFieldWrapper label="Estado" id="estado">
							<div class="flex items-center gap-2">
								<span class="badge badge-{pedido.estado.color}">{pedido.estado.nombre}</span>
								{#if pedido.transiciones?.length > 0}
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
										{#each pedido.transiciones as t (t.estado_destino_id)}
											<li>
												<button onclick={() => moverPedido(t.estado_destino_id, t.destino_nombre)}>
													<span class="badge badge-{t.destino_color} badge-xs"></span>
													{t.destino_nombre}
												</button>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</FormFieldWrapper>
						{#if pedido.presupuesto}
							<FormFieldWrapper label="Presupuesto" id="presupuesto">
								<p class="font-semibold">{pedido.presupuesto}</p>
							</FormFieldWrapper>
						{/if}
						{#if pedido.observaciones}
							<FormFieldWrapper label="Observaciones" id="observaciones">
								<p class="whitespace-pre-wrap">{pedido.observaciones}</p>
							</FormFieldWrapper>
						{/if}
					</div>
				</div>
			</div>

			<!-- Líneas del pedido -->
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Productos</h2>

					<div>
						{#snippet header()}
							<th>Código</th>
							<th>Producto</th>
							<th>Cantidad</th>
							<th>Precio Unit.</th>
							<th>Subtotal</th>
							<th>Fabricación</th>
							<th class="text-center">Acciones</th>
						{/snippet}

						{#snippet row(linea)}
							{#if linea.es_personalizado}
								<td>
									<span class="ml-2 badge badge-outline badge-sm">Personalizado</span>
								</td>
							{:else}
								<td class="font-mono text-sm">
									{linea.producto_codigo || '-'}
								</td>
							{/if}
							<td>
								{linea.producto_nombre || linea.descripcion_personalizada || '-'}
							</td>
							<td class="text-center">{linea.cantidad}</td>
							<td class="text-right">${linea.precio_unitario?.toLocaleString() || '0'}</td>
							<td class="text-right font-semibold">${linea.subtotal?.toLocaleString() || '0'}</td>
							<td>
								{#if linea.produccion}
									{@const p = linea.produccion}
									<div class="flex items-center gap-2">
										<button
											class={`badge-${p.es_final ? 'success' : p.total > 0 ? 'warning' : 'ghost'} badge cursor-pointer hover:opacity-80`}
											onclick={() => irADetalleOrden(p.orden_id)}
										>
											{p.es_final ? 'Terminado' : p.total > 0 ? 'En progreso' : 'Sin unidades'}
											({p.terminadas}/{p.total})
										</button>
									</div>
								{:else}
									<span class="text-sm text-base-content/50">Sin Orden</span>
								{/if}
							</td>
							<td class="text-center">
								{#if linea.produccion}
									<button
										class="btn btn-ghost text-nowrap btn-sm"
										onclick={() => irADetalleOrden(linea.produccion.orden_id)}
									>
										Ver orden
									</button>
								{:else}
									<button
										class="btn text-nowrap btn-primary btn-sm"
										onclick={() => irAFabricacion(linea.id)}
									>
										Pasar a fabricación
									</button>
								{/if}
							</td>
						{/snippet}
						{#snippet footer()}
							<td colspan="6" class="text-right font-bold">Total:</td>
							<td class="text-right text-lg font-bold text-primary">
								${pedido.total?.toLocaleString() || '0'}
							</td>
						{/snippet}
						<Table data={await lineas} {header} {row} {footer} />
					</div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<PedidoPagos pedidoId={pedido.id} />
				<PedidoEnvios pedidoId={pedido.id} />
			</div>

			<!-- Historial del pedido -->
			<div class="card bg-base-100 shadow">
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
						<td>{log.empleado || '-'}</td>
						<td>{log.comentario || '-'}</td>
					{/snippet}
					<Table
						data={await getHistorialPedido(parseInt(page.params.id ?? ''))}
						header={headerHistorial}
						row={rowHistorial}
					/>
				</div>
			</div>
		</div>
	{/if}
</PageLayout>

<Modal bind:open={showEliminar} title="Eliminar Pedido" onClose={cerrarModal}>
	<p>¿Eliminar el pedido <strong>{pedido?.numero_pedido}</strong>?</p>

	{#snippet actions()}
		<button class="btn" onclick={cerrarModal}>Cancelar</button>
		<button class="btn btn-error" onclick={confirmarEliminar}>Eliminar</button>
	{/snippet}
</Modal>
