<script lang="ts">
	import type { PageData } from './$types';
	let data: PageData = $props();
	import { resolve } from '$app/paths';
	import { PageLayout } from '$lib/components/ui';
</script>

<PageLayout>
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Pedidos</h1>
		<a href={resolve('/pedidos/crear')} class="btn btn-primary">+ Nuevo Pedido</a>
	</div>

	<div class="overflow-x-auto">
		{#if data.pedidos}
			<table class="table">
				<thead>
					<tr>
						<th>N° Orden</th>
						<th>Cliente</th>
						<th>Fecha</th>
						<th>Total</th>
						<th>Estado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.pedidos as pedido (pedido.id)}
						<tr>
							<td>{pedido.numero_pedido}</td>
							<td>{pedido.cliente_id || '-'}</td>
							<td>{new Date(pedido.fecha_pedido).toLocaleDateString()}</td>
							<td>${pedido.precio_total?.toLocaleString() || 0}</td>
							<td>
								<span
									class="badge"
									style="background-color: {pedido.estadoColor}20; color: {pedido.estadoColor}"
								>
									{pedido.estado_id || '-'}
								</span>
							</td>
							<td>
								<a href={resolve(`/pedidos/${pedido.id}`)} class="btn btn-ghost btn-sm">Ver</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div>Sin pedidos</div>
		{/if}
	</div>
</PageLayout>
