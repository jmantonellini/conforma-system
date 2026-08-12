<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Table, SearchBar, Pagination } from '$lib/components/ui';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import { Eye } from '$lib/components/ui/icons';
	import type { PageProps } from './$types';
	import { debounce } from '$lib/utils/debounce';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { formatearFecha } from '$lib/utils/fechas';

	let { data }: PageProps = $props();

	let search = $derived(data.search);
	let estadoFilter = $derived(data.estadoFilter);
	let currentPage = $derived(data.currentPage);

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (estadoFilter) params.set('estado', estadoFilter);
		if (currentPage > 1) params.set('page', currentPage.toString());
		goto(resolve(`/pedidos?${params.toString()}`));
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-4">
			<div class="w-full sm:w-80">
				<SearchBar autofocus bind:search oninput={() => debounce(handleSearchChange)} />
			</div>
			<select bind:value={estadoFilter} class="select w-48" onchange={handleSearchChange}>
				<option value="">Todos los estados</option>
				{#each data.estados as est (est.id)}
					<option value={String(est.id)}>{est.nombre}</option>
				{/each}
			</select>
		</div>
		<a class="btn btn-primary" href={resolve('/pedidos/crear')}>+ Nuevo Pedido</a>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>N° Pedido</th>
				<th>Cliente</th>
				<th>Fecha</th>
				<th>Entrega</th>
				<th class="text-right">Total</th>
				<th>Estado</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(pedido)}
				<td class="font-mono text-sm">{pedido.numero_pedido}</td>
				<td class="font-medium">{pedido.cliente_nombre || '-'}</td>
				<td>{formatearFecha(new Date(pedido.fecha_pedido))}</td>
				<td class:text-error={pedido.fecha_entrega < new Date().toISOString()}>
					{formatearFecha(new Date(pedido.fecha_entrega))}
				</td>
				<td class="text-right font-medium">
					${pedido.total?.toLocaleString() || 0}
				</td>
				<td>
					<span class="badge badge-dash capitalize badge-{pedido.estado_color}">
						{pedido.estado_nombre}
					</span>
				</td>
				<td class="text-center">
					<a class="btn btn-circle btn-ghost btn-sm" href={resolve(`/pedidos/${pedido.id}`)}>
						<Eye />
					</a>
				</td>
			{/snippet}

			<Table
				data={data.pedidos}
				loading={false}
				emptyMessage="No hay pedidos registrados"
				{header}
				{row}
			/>

			{#if data.totalPages > 1}
				<div class="mt-6 flex justify-center">
					<Pagination
						currentPage={data.currentPage}
						totalPages={data.totalPages}
						onPageChange={(page) => {
							currentPage = page;
							handleSearchChange();
						}}
					/>
				</div>
			{/if}
		</div>
	</div>
</PageLayout>
