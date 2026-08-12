<script lang="ts">
	import { PageLayout, Table } from '$lib/components/ui';
	import { getEnvios, marcarEntregado } from '$lib/remote/envios.remote';
	import { resolve } from '$app/paths';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatearFecha } from '$lib/utils/fechas';

	let envios = $derived(await getEnvios({ page: 1 }));
</script>

<PageLayout>
	<h1 class="mb-6 text-2xl font-bold">Envíos</h1>

	<div class="card bg-base-100 shadow">
		<div class="card-body">
			{#snippet header()}
				<th>Guía</th>
				<th>Transportista</th>
				<th>Pedido</th>
				<th>Cliente</th>
				<th>Estado</th>
				<th>Fecha</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(e)}
				<td class="font-mono">{e.numero_guia || '-'}</td>
				<td>{e.transportista}</td>
				<td>
					<a class="link" href={resolve(`/pedidos/${e.pedido_id}`)}>{e.pedido_numero}</a>
				</td>
				<td>{e.cliente_nombre || '-'}</td>
				<td>
					<span
						class="badge badge-dash capitalize badge-{e.estado === 'entregado'
							? 'success'
							: 'warning'}"
					>
						{e.estado}
					</span>
				</td>
				<td>{e.fecha_envio ? formatearFecha(new Date(e.fecha_envio)) : '-'}</td>
				<td class="text-center">
					{#if e.estado !== 'entregado'}
						<button
							class="btn btn-sm btn-success"
							onclick={async () => {
								await marcarEntregado(String(e.id));
								toast.success('Entrega confirmada');
							}}
						>
							Confirmar
						</button>
					{:else}
						<span class="text-sm text-base-content/50">-</span>
					{/if}
				</td>
			{/snippet}

			<Table data={envios.data} {header} {row} />
		</div>
	</div>
</PageLayout>
