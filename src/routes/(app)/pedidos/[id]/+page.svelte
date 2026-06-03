<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	let data: PageData = $props();

	let showDeleteModal = $state(false);
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href={resolve('/pedidos')} class="btn btn-ghost btn-sm">← Volver</a>
			<h1 class="text-2xl font-bold">Pedido {data.pedido.numero_pedido}</h1>
		</div>
		<button class="btn btn-error" onclick={() => (showDeleteModal = true)}> Eliminar </button>
	</div>

	<!-- Datos del pedido -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<span class="text-sm text-base-content/70">Cliente</span>
					<p class="font-semibold">{data.pedido.cliente_nombre || '-'}</p>
				</div>
				<div>
					<span class="text-sm text-base-content/70">Fecha</span>
					<p>{new Date(data.pedido.fecha_pedido).toLocaleDateString()}</p>
				</div>
			</div>

			{#if data.pedido.observaciones}
				<div>
					<span class="text-sm text-base-content/70">Observaciones</span>
					<p class="whitespace-pre-wrap">{data.pedido.observaciones}</p>
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
						{#each data.lineas as linea (linea.id)}
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
								<td class="text-right font-semibold">${linea.subtotal?.toLocaleString() || '0'}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="border-t-2">
							<td colspan="4" class="text-right font-bold">Total:</td>
							<td class="text-right text-lg font-bold text-primary">
								${data.pedido.precio_total?.toLocaleString() || '0'}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Modal eliminar -->
{#if showDeleteModal}
	<dialog class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Eliminar Pedido</h3>
			<p class="py-4">¿Eliminar el pedido {data.pedido.numero_pedido}?</p>
			<div class="modal-action">
				<button class="btn" onclick={() => (showDeleteModal = false)}>Cancelar</button>
				<form method="POST" action="?/eliminar">
					<button type="submit" class="btn btn-error">Eliminar</button>
				</form>
			</div>
		</div>
	</dialog>
{/if}
