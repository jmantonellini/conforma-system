<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, Highlight, PageLayout, Pagination, SearchBar, Table } from '$lib/components/ui';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import { eliminarInsumo } from '$lib/remote/insumos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let search = $state('');
	let tipo = $state('');
	let categoriaId = $state('');
	let currentPage = $state(1);
	let sort = $state<'nombre' | 'codigo' | 'costo_unitario'>('nombre');
	let direction = $state<'asc' | 'desc'>('asc');

	$effect(() => {
		search = data.search ?? '';
		tipo = data.tipo ?? '';
		categoriaId = data.categoriaId ?? '';
		currentPage = data.currentPage ?? 1;
		sort = data.sort ?? 'nombre';
		direction = (data.direction ?? 'asc') as typeof direction;
	});

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (tipo) params.set('tipo', tipo);
		if (categoriaId) params.set('categoria', categoriaId);
		if (currentPage > 1) params.set('page', currentPage.toString());
		if (sort !== 'nombre') params.set('sort', sort);
		if (direction !== 'asc') params.set('direction', direction);
		goto(resolve(`/insumos?${params.toString()}`));
	}

	function handleSort(key: string) {
		if (!['nombre', 'codigo', 'costo_unitario'].includes(key)) return;
		const sortKey = key as typeof sort;
		if (sort === sortKey) direction = direction === 'asc' ? 'desc' : 'asc';
		else {
			sort = sortKey;
			direction = 'asc';
		}
		currentPage = 1;
		handleSearchChange();
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-3 lg:flex-nowrap">
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
				class="select select-sm"
				bind:value={tipo}
				onchange={() => {
					currentPage = 1;
					handleSearchChange();
				}}
			>
				<option value="">Todos los tipos</option>
				<option value="material">Material</option>
				<option value="mano_obra">Mano de obra</option>
				<option value="indirecto">Costo indirecto</option>
				<option value="herramienta">Herramienta</option>
			</select>
			<select
				class="select select-sm"
				bind:value={categoriaId}
				onchange={() => {
					currentPage = 1;
					handleSearchChange();
				}}
			>
				<option value="">Todas las categorías</option>
				{#each data.categorias as categoria (categoria.id)}
					<option value={String(categoria.id)}>{categoria.nombre}</option>
				{/each}
			</select>
		</div>
		<div class="flex gap-3">
			<Can modulo="insumos" accion="import">
				<a class="btn btn-sm btn-outline" href={resolve('/insumos/importar')}>Excel</a>
			</Can>
			<Can modulo="insumos" accion="create">
				<a class="btn btn-sm btn-primary" href={resolve('/insumos/crear')}>+ Nuevo insumo</a>
			</Can>
		</div>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header(onSort: ((key: string) => void) | undefined)}
				<th><button class="link" onclick={() => onSort?.('codigo')}>Código</button></th><th
					><button class="link" onclick={() => onSort?.('nombre')}>Descripción</button></th
				><th>Tipo</th><th>Categoría</th><th>Unidad</th><th class="text-right"
					><button class="link" onclick={() => onSort?.('costo_unitario')}>Costo vigente</button
					></th
				><th>Acciones</th>
			{/snippet}
			{#snippet row(insumo: (typeof data.insumos.data)[number])}
				<td class="font-mono text-sm"><Highlight text={insumo.codigo} query={search} /></td>
				<td class="font-medium"><Highlight text={insumo.nombre} query={search} /></td>
				<td
					><span class="badge badge-ghost"
						><Highlight
							text={typeof insumo.tipo === 'object' ? insumo.tipo?.nombre : insumo.tipo}
							query={search}
						/></span
					></td
				>
				<td><Highlight text={insumo.categoria?.nombre ?? 'Sin categoría'} query={search} /></td>
				<td>{insumo.unidad}</td>
				<td class="text-right"
					>${insumo.costo_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td
				>
				<td>
					<div class="flex justify-center gap-2">
						<Can modulo="insumos" accion="edit">
							<a
								class="btn btn-circle btn-ghost btn-sm"
								title="Editar"
								href={resolve(`/insumos/${insumo.id}`)}
							>
								<Edit />
							</a>
						</Can>
						<Can modulo="insumos" accion="delete">
							<button
								class="btn btn-circle btn-ghost text-error btn-sm"
								title="Eliminar"
								onclick={async () => {
									await eliminarInsumo(insumo.id);
									await invalidateAll();
									toast.success('Insumo eliminado');
								}}><Delete /></button
							>
						</Can>
					</div>
				</td>
			{/snippet}
			<Table
				data={data.insumos.data}
				{header}
				{row}
				onSort={handleSort}
				emptyMessage="No hay insumos registrados"
			/>
			{#if data.insumos.totalPages > 1}
				<div class="mt-6 flex justify-center">
					<Pagination
						currentPage={data.currentPage}
						totalPages={data.insumos.totalPages}
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
