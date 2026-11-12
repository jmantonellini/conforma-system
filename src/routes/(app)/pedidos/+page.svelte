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
	import { diasHasta, fechaRelativa, formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda } from '$lib/utils/precios';
	import { can } from '$lib/utils/permissions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const veImportes = can(page.data.user, page.data.permisos, 'importes', 'view');
	const busqueda = $derived(parametro('search'));

	type Pedido = (typeof data.pedidos)[number];

	/** Entrega: vencida en rojo, próxima (≤ 3 días) en amarillo; los pedidos cerrados no alertan. */
	function entrega(pedido: Pedido) {
		if (pedido.fecha_entrega_real) return { texto: 'Entregado', clase: 'text-success' };
		if (!pedido.fecha_entrega || pedido.estado_final) return null;
		const dias = diasHasta(pedido.fecha_entrega);
		const texto =
			dias < 0
				? `Vencido · ${fechaRelativa(pedido.fecha_entrega)}`
				: fechaRelativa(pedido.fecha_entrega);
		return { texto, clase: dias < 0 ? 'text-error' : dias <= 3 ? 'text-warning' : 'secundario' };
	}

	function cobro(pedido: Pedido) {
		const total = pedido.total ?? 0;
		const saldo = total - (pedido.pagado ?? 0);
		if (!total) return null;
		if (saldo <= 0) return { texto: 'Pagado', clase: 'text-success' };
		if (!pedido.pagado) return { texto: 'Sin cobrar', clase: 'secundario' };
		return { texto: `Saldo ${formatearMoneda(saldo)}`, clase: 'text-warning' };
	}
</script>

<Listado
	titulo="Pedidos"
	datos={data.pedidos}
	total={data.total}
	pagina={data.currentPage}
	paginas={data.totalPages}
	buscar="Número o cliente..."
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
		<th>Pedido</th>
		<th>Cliente</th>
		<th class="hidden lg:table-cell">Artículos</th>
		<th>Entrega</th>
		<th class="hidden md:table-cell">Producción</th>
		{#if veImportes}<th class="text-right">Total</th>{/if}
		<th>Estado</th>
	{/snippet}
	{#snippet row(pedido: Pedido)}
		{@const aviso = entrega(pedido)}
		{@const pago = veImportes ? cobro(pedido) : null}
		{@const unidades = pedido.unidades}
		<td>
			<a class="enlace-fila font-mono" href={resolve(`/pedidos/${pedido.id}`)}>
				<Highlight text={pedido.numero_pedido} query={busqueda} />
			</a>
			<p class="secundario">{formatearFecha(pedido.fecha_pedido)}</p>
		</td>
		<td class="max-w-56">
			<p class="truncate font-medium">
				<Highlight text={pedido.cliente_nombre || '-'} query={busqueda} />
			</p>
			{#if pedido.distribuidor_nombre}
				<p class="secundario truncate">vía {pedido.distribuidor_nombre}</p>
			{/if}
		</td>
		<td class="hidden max-w-64 lg:table-cell">
			{#if pedido.primer_articulo}
				<p class="truncate">{pedido.primer_articulo}</p>
				<p class="secundario">
					{pedido.articulos}
					{pedido.articulos === 1 ? 'unidad' : 'unidades'}
				</p>
			{:else}
				<span class="secundario">Sin artículos</span>
			{/if}
		</td>
		<td class="whitespace-nowrap">
			{formatearFecha(pedido.fecha_entrega_real ?? pedido.fecha_entrega)}
			{#if aviso}<p class={['text-xs font-medium', aviso.clase]}>{aviso.texto}</p>{/if}
		</td>
		<td class="hidden md:table-cell">
			{#if unidades?.total}
				<div class="flex items-center gap-2">
					<progress
						class={[
							'progress w-16',
							unidades.terminadas === unidades.total ? 'progress-success' : 'progress-primary'
						]}
						value={unidades.terminadas}
						max={unidades.total}
					></progress>
					<span class="text-xs text-base-content/70 tabular-nums">
						{unidades.terminadas}/{unidades.total}
					</span>
				</div>
			{:else}
				<span class="secundario">Sin órdenes</span>
			{/if}
		</td>
		{#if veImportes}
			<td class="numero">
				<span class="font-medium">{formatearMoneda(pedido.total)}</span>
				{#if pago}<p class={['text-xs font-medium', pago.clase]}>{pago.texto}</p>{/if}
			</td>
		{/if}
		<td>
			<EstadoBadge
				class="badge-sm"
				estado={{ nombre: pedido.estado_nombre, color: pedido.estado_color }}
			/>
		</td>
	{/snippet}
</Listado>
