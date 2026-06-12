<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { PageHeader, PageLayout } from '$lib/components/ui';
	import { eliminarPedido, getPedidoById } from '$lib/remote/pedidos.remote';

	let { pedido, lineas } = $derived(await getPedidoById(parseInt(page.params.id ?? '')));

	let showDeleteModal = $state(false);
</script>

<PageLayout>
	{#if pedido}
		<PageHeader title={'Pedido ' + pedido.numero_pedido} description="Detalles del pedido" />
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<a href={resolve('/pedidos')} class="btn btn-ghost btn-sm">← Volver</a>
				<button class="btn btn-outline btn-sm btn-error" onclick={() => (showDeleteModal = true)}
					>Eliminar</button
				>
			</div>
			<!-- Datos del pedido -->
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<span class="text-sm text-base-content/70">Cliente</span>
							<p class="font-semibold">{pedido.cliente_nombre || '-'}</p>
						</div>
						<div>
							<span class="text-sm text-base-content/70">Fecha</span>
							<p>{new Date(pedido.fecha).toLocaleDateString()}</p>
						</div>
					</div>

					{#if pedido.observaciones}
						<div>
							<span class="text-sm text-base-content/70">Observaciones</span>
							<p class="whitespace-pre-wrap">{pedido.observaciones}</p>
						</div>
					{/if}
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
								await eliminarPedido(pedido?.id);
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
