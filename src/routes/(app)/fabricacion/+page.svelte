<script lang="ts">
	import {
		getOrdenesFabricacion,
		getEstadosFabricacion,
		eliminarOrdenFabricacion
	} from '$lib/remote/fabricacion.remote';
	import { Highlight, Table, PageLayout, Pagination, Modal } from '$lib/components/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { Delete, Eye } from '$lib/components/ui/icons';
	import { page } from '$app/state';
	import { toast } from '$lib/stores/toast.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import { debounce } from '$lib/utils/debounce';

	let estados = await getEstadosFabricacion();
	let showModal = $state(false);
	let deleteOrdenId = $state('');
	let estadoFilter = $state(0);
	let currentPage = $state(1);
	let search = $state('');

	$effect(() => {
		const params = page.url.searchParams;
		search = params.get('search') ?? '';
		estadoFilter = Number(params.get('estado')) || 0;
		currentPage = Number(params.get('page')) || 1;
	});

	function closeModal() {
		showModal = false;
	}

	let ordenesData = $derived(
		await getOrdenesFabricacion({
			search: search || undefined,
			estado: estadoFilter || undefined,
			page: currentPage
		})
	);

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (estadoFilter) params.set('estado', String(estadoFilter));
		if (currentPage > 1) params.set('page', String(currentPage));

		goto(resolve(`/fabricacion?${params.toString()}`));
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-4">
			<div class="w-full sm:w-80">
				<SearchBar
					autofocus
					bind:search
					oninput={() => {
						currentPage = 1;
						debounce(handleSearchChange);
					}}
				/>
			</div>
			<select
				bind:value={estadoFilter}
				class="select select-sm w-48"
				onchange={() => {
					currentPage = 1;
					handleSearchChange();
				}}
			>
				<option value={0}>Todos los estados</option>
				{#each estados as e (e.id)}
					<option value={e.id}>{e.nombre}</option>
				{/each}
			</select>
		</div>
		<a href={resolve('/fabricacion/crear')} class="btn btn-sm btn-primary">+ Nueva Orden</a>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>N° Orden</th>
				<th>Estado</th>
				<th>Trabajo</th>
				<th>Producto</th>
				<th class="text-center">Progreso</th>
				<th>Prioridad</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(orden: (typeof ordenesData.ordenes)[number])}
				<td class="font-mono text-sm"><Highlight text={`OF-${orden.id}`} query={search} /></td>
				<td>
					<span
						class={`badge badge-soft whitespace-nowrap capitalize badge-${orden.estado?.color}`}
					>
						{orden.estado?.nombre}
					</span>
				</td>
				<td class="font-medium"><Highlight text={orden.nombre_trabajo} query={search} /></td>
				<td><Highlight text={orden.producto_nombre || '-'} query={search} /></td>
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
					{#if orden.prioridad === 2}
						<span class="badge badge-error">Crítica</span>
					{:else if orden.prioridad === 1}
						<span class="badge badge-warning">Urgente</span>
					{:else}
						<span class="badge badge-ghost">Normal</span>
					{/if}
				</td>
				<td class="flex flex-nowrap items-center gap-1">
					<a
						class="btn btn-circle btn-ghost btn-sm"
						title="Ver cliente"
						href={resolve(`/fabricacion/${orden.id}`)}
					>
						<Eye />
					</a>
					<button
						class="btn btn-circle btn-ghost text-error btn-sm"
						title="Eliminar"
						onclick={() => {
							deleteOrdenId = String(orden.id);
							showModal = true;
						}}
					>
						<Delete />
					</button>
				</td>
			{/snippet}

			<Table
				data={ordenesData.ordenes}
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
							handleSearchChange();
						}}
					/>
				</div>
			{/if}
		</div>
	</div>
</PageLayout>

<Modal bind:open={showModal} title="Eliminar orden de fabricación" onClose={closeModal}>
	<div class="py-4">
		<p>¿Seguro que quieres eliminar esta orden de fabricación?</p>
	</div>
	{#snippet actions()}
		<button class="btn" onclick={closeModal}>Cancelar</button>
		<button
			class="btn btn-error"
			onclick={async () => {
				try {
					await eliminarOrdenFabricacion(deleteOrdenId);
					closeModal();
					await invalidateAll();
					toast.success('Orden eliminada');
				} catch (error) {
					console.log(error);
					toast.error('Error al eliminar');
				}
			}}>Eliminar</button
		>
	{/snippet}
</Modal>
