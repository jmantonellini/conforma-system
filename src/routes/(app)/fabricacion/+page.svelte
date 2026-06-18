<script lang="ts">
	import {
		getOrdenesFabricacion,
		getEstadosFabricacion,
		eliminarOrdenFabricacion
	} from '$lib/remote/fabricacion.remote';
	import { Table, PageHeader, PageLayout, Pagination } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { Delete, Eye } from '$lib/components/ui/icons';
	import { page } from '$app/state';

	let estados = await getEstadosFabricacion();

	let estadoFilter = $derived(Number(page.url.searchParams.get('estado')) || 0);
	let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	let ordenesData = $derived(
		await getOrdenesFabricacion({
			estado: estadoFilter || undefined,
			page: currentPage
		})
	);

	function handleSearch() {
		const params = new SvelteURLSearchParams();
		if (estadoFilter) params.set('estado', String(estadoFilter));
		if (currentPage > 1) params.set('page', String(currentPage));
		console.log('ESTADO', estadoFilter);
		console.log(params.toString());

		goto(resolve(`/fabricacion?${params.toString()}`));
	}
</script>

<PageLayout>
	<PageHeader title="Fabricación" description="Control de órdenes de producción" />

	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-4">
			<select bind:value={estadoFilter} class="select w-48" onchange={handleSearch}>
				<option value={0}>Todos los estados</option>
				{#each estados as e (e.id)}
					<option value={e.id}>{e.nombre}</option>
				{/each}
			</select>
		</div>
		<a href={resolve('/fabricacion/crear')} class="btn btn-primary">+ Nueva Orden</a>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>N° Orden</th>
				<th>Trabajo</th>
				<th>Producto</th>
				<th class="text-center">Progreso</th>
				<th>Estado</th>
				<th>Prioridad</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(orden)}
				<td class="font-mono text-sm">OF-{orden.id}</td>
				<td class="font-medium">{orden.nombre_trabajo}</td>
				<td>{orden.producto_nombre || '-'}</td>
				<td class="text-center">
					<div class="flex items-center gap-2">
						<progress
							class="progress w-24"
							value={orden.cantidad_producida}
							max={orden.cantidad_total}
						></progress>
						<span class="text-sm">{orden.cantidad_producida}/{orden.cantidad_total}</span>
					</div>
				</td>
				<td>
					<span class={`badge badge-sm badge-${orden.estado.color}`}>
						{orden.estado.nombre}
					</span>
				</td>
				<td>
					{#if orden.prioridad === 2}
						<span class="badge badge-error">Crítica</span>
					{:else if orden.prioridad === 1}
						<span class="badge badge-warning">Urgente</span>
					{:else}
						<span class="badge badge-ghost">Normal</span>
					{/if}
				</td>
				<td class="text-center">
					<a
						class="btn btn-circle btn-ghost btn-sm"
						title="Ver cliente"
						href={resolve(`/fabricacion/${orden.id}`)}
					>
						<Eye />
					</a>
					<button
						class="btn btn-circle text-error btn-ghost btn-sm"
						title="Eliminar"
						onclick={() => {
							eliminarOrdenFabricacion(orden.id);
						}}
					>
						<Delete />
					</button>
				</td>
			{/snippet}

			<Table
				data={ordenesData.data}
				loading={false}
				emptyMessage="No hay órdenes de fabricación"
				{header}
				{row}
			/>

			{#if ordenesData.totalPages > 1}
				<div class="mt-6 flex justify-center">
					<Pagination
						currentPage={ordenesData.currentPage}
						totalPages={ordenesData.totalPages}
						onPageChange={(page) => {
							currentPage = page;
							handleSearch();
						}}
					/>
				</div>
			{/if}
		</div>
	</div>
</PageLayout>
