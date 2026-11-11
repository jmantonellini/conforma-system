<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		Can,
		EstadoBadge,
		Highlight,
		Icono,
		Listado,
		filtrar,
		parametro
	} from '$lib/components/ui';
	import { estaVencido, formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda } from '$lib/utils/precios';
	import { can } from '$lib/utils/permissions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const veImportes = can(page.data.user, page.data.permisos, 'importes', 'view');
	const busqueda = $derived(parametro('search'));
</script>

<Listado
	titulo="Pedidos"
	datos={data.pedidos}
	total={data.total}
	pagina={data.currentPage}
	paginas={data.totalPages}
	buscar="Buscar por número..."
	vacio="No hay pedidos para estos filtros"
>
	{#snippet acciones()}
		<Can modulo="pedidos" accion="create">
			<a class="btn btn-primary btn-sm" href={resolve('/pedidos/crear')}>
				<Icono nombre="mas_simple" /> Nuevo pedido
			</a>
		</Can>
	{/snippet}
	{#snippet filtros()}
		<select
			class="select w-48 select-sm"
			value={parametro('estado')}
			onchange={(e) => filtrar({ estado: e.currentTarget.value })}
		>
			<option value="">Todos los estados</option>
			{#each data.estados as estado (estado.id)}
				<option value={String(estado.id)}>{estado.nombre}</option>
			{/each}
		</select>
	{/snippet}
	{#snippet header()}
		<th>Número</th>
		<th>Cliente</th>
		<th>Fecha</th>
		<th>Entrega</th>
		{#if veImportes}<th class="text-right">Total</th>{/if}
		<th>Estado</th>
	{/snippet}
	{#snippet row(pedido: (typeof data.pedidos)[number])}
		<td>
			<a class="enlace-fila font-mono" href={resolve(`/pedidos/${pedido.id}`)}>
				<Highlight text={pedido.numero_pedido} query={busqueda} />
			</a>
		</td>
		<td class="font-medium">{pedido.cliente_nombre || '-'}</td>
		<td class="text-base-content/70">{formatearFecha(pedido.fecha_pedido)}</td>
		<td
			class={estaVencido(pedido.fecha_entrega) ? 'font-medium text-error' : 'text-base-content/70'}
		>
			{formatearFecha(pedido.fecha_entrega)}
		</td>
		{#if veImportes}<td class="numero font-medium">{formatearMoneda(pedido.total)}</td>{/if}
		<td>
			<EstadoBadge
				class="badge-sm"
				estado={{ nombre: pedido.estado_nombre, color: pedido.estado_color }}
			/>
		</td>
	{/snippet}
</Listado>
