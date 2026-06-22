<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { FormFieldWrapper, PageHeader, PageLayout } from '$lib/components/ui';
	import { eliminarPedido, getPedidoById } from '$lib/remote/pedidos.remote';
	import { toast } from '$lib/stores/toast.svelte';

	let { pedido, lineas } = $derived(await getPedidoById(parseInt(page.params.id ?? '')));

	let showDeleteModal = $state(false);

	function irAFabricacion(lineaId: number) {
		goto(resolve(`/fabricacion/crear?linea=${lineaId}`));
	}

	function irADetalleOrden(ordenId: number | null) {
		if (ordenId) goto(resolve(`/fabricacion/${ordenId}`));
	}

	console.log('LINEAS', lineas);
	
</script>

<PageLayout>
	{#if pedido}
		<PageHeader title={'Pedido ' + pedido.numero_pedido} description="Detalles del pedido" />
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<a href={resolve('/pedidos')} class="btn btn-ghost btn-sm">← Volver</a>
				<button
					class="btn btn-outline btn-sm btn-error"
					onclick={() => {
						showDeleteModal = true;
					}}>Eliminar</button
				>
			</div>
			<!-- Datos del pedido -->
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<div class="grid grid-cols-2 gap-4">
						<FormFieldWrapper label="Cliente" id="cliente">
							<p class="font-semibold">{pedido.cliente_nombre || '-'}</p>
						</FormFieldWrapper>
						<FormFieldWrapper label="Fecha" id="fecha">
							<p>{new Date(pedido.fecha).toLocaleDateString()}</p>
						</FormFieldWrapper>
						{#if pedido.observaciones}
							<FormFieldWrapper label="Observaciones" id="observaciones">
								<p class="whitespace-pre-wrap">{pedido.observaciones}</p>
							</FormFieldWrapper>
						{/if}
						<FormFieldWrapper label="Estado" id="estado">
							<span class="badge badge-{pedido.estado.color}">{pedido.estado.nombre}</span>
						</FormFieldWrapper>
					</div>
				</div>
			</div>

			<!-- Líneas del pedido -->
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Productos</h2>

					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Código</th>
									<th>Producto</th>
									<th>Cantidad</th>
									<th>Precio Unit.</th>
									<th>Subtotal</th>
									<th>Fabricación</th>
									<th class="text-center">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{#each lineas as linea (linea.id)}
									<tr>
										<td class="font-mono text-sm">
											{linea.producto_codigo || (linea.es_personalizado ? 'Personalizado' : '-')}
										</td>
										<td>
											{linea.producto_nombre || linea.descripcion_personalizada || '-'}
											{#if linea.es_personalizado}
												<span class="ml-2 badge badge-outline badge-sm">Personalizado</span>
											{/if}
										</td><td class="text-center">{linea.cantidad}</td>
										<td class="text-right">${linea.precio_unitario?.toLocaleString() || '0'}</td>
										<td class="text-right font-semibold"
											>${linea.subtotal?.toLocaleString() || '0'}</td
										>
										<td>
											{#if linea.tiene_orden}
												<div class="flex items-center gap-2">
													<button
														class={`badge badge-${linea.orden.estado_color} cursor-pointer hover:opacity-80`}
														onclick={() => irADetalleOrden(linea.orden.id)}
													>
														{linea.orden.estado_nombre}
													</button>
												</div>
											{:else}
												<span class="text-sm text-base-content/50">Sin Orden</span>
											{/if}
										</td>
										<td class="text-center">
											{#if linea.tiene_orden}
												<button
													class="btn btn-ghost btn-sm"
													onclick={() => irADetalleOrden(linea.orden.id)}
												>
													Ver orden
												</button>
											{:else}
												<button
													class="btn btn-sm btn-primary"
													onclick={() => irAFabricacion(linea.id)}
												>
													Pasar a fabricación
												</button>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot>
								<tr class="border-t-2">
									<td colspan="4" class="text-right font-bold">Total:</td>
									<td class="text-right text-lg font-bold text-primary">
										${pedido.total?.toLocaleString() || '0'}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			</div>
		</div>
	{/if}
</PageLayout>

<!-- Modal eliminar -->
{#if showDeleteModal}
	<dialog class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Eliminar Pedido</h3>
			<p class="py-4">¿Eliminar el pedido {pedido?.numero_pedido}?</p>
			<div class="modal-action">
				<button class="btn" onclick={() => (showDeleteModal = false)}>Cancelar</button>
				<button
					class="btn btn-error"
					onclick={async () => {
						try {
							if (pedido) {
								await eliminarPedido(pedido?.id).then(() => {
									toast.success('Pedido eliminado');
									goto(resolve('/pedidos'));
								});
							}
						} catch (error) {
							console.log(error);
						}
					}}>Eliminar</button
				>
			</div>
		</div>
	</dialog>
{/if}
