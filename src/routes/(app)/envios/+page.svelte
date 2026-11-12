<script lang="ts">
	import { EstadoBadge, Listado } from '$lib/ui';
	import { getEnvios, marcarEntregado } from '$lib/modulos/pedidos/envios.remote';
	import { resolve } from '$app/paths';
	import { toast } from '$lib/ui/toast.svelte';
	import { formatearFecha } from '$lib/utils/fechas';

	const envios = $derived(await getEnvios({ page: 1 }));
</script>

<Listado titulo="Envíos" datos={envios.data} buscar={false} vacio="No hay envíos registrados">
	{#snippet header()}
		<th>Pedido</th>
		<th>Transportista</th>
		<th>Estado</th>
		<th>Fecha</th>
		<th></th>
	{/snippet}
	{#snippet row(envio: (typeof envios.data)[number])}
		<td>
			<a class="enlace-fila font-mono" href={resolve(`/pedidos/${envio.pedido_id}`)}>
				{envio.pedido_numero}
			</a>
			<p class="secundario">{envio.cliente_nombre || '-'}</p>
		</td>
		<td>
			<p>{envio.transportista}</p>
			<p class="secundario font-mono">Guía {envio.numero_guia || '-'}</p>
		</td>
		<td>
			<EstadoBadge
				class="badge-sm capitalize"
				estado={{
					nombre: envio.estado,
					color: envio.estado === 'entregado' ? 'success' : 'warning'
				}}
			/>
		</td>
		<td class="text-base-content/70">{formatearFecha(envio.fecha_envio)}</td>
		<td class="w-0">
			{#if envio.estado !== 'entregado'}
				<button
					class="btn btn-sm"
					onclick={async () => {
						await marcarEntregado(String(envio.id));
						toast.success('Entrega confirmada');
					}}
				>
					Marcar entregado
				</button>
			{/if}
		</td>
	{/snippet}
</Listado>
