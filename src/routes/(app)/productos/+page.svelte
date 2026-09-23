<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, Highlight, Table, SearchBar, Pagination } from '$lib/components/ui';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import { eliminarProducto } from '$lib/remote/productos.remote';
	import type { PageProps } from './$types';
	import { toast } from '$lib/stores/toast.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { page } from '$app/state';

	let { data }: PageProps = $props();

	let search = $state('');
	let categoriaFilter = $state(0);
	let currentPage = $state(1);
	let sort = $state<'nombre' | 'codigo' | 'precio_base'>('nombre');
	let direction = $state<'asc' | 'desc'>('asc');
	let categorias = page.data.categorias;

	$effect(() => {
		search = data.search ?? '';
		categoriaFilter = data.categoriaFilter ?? 0;
		currentPage = data.currentPage ?? 1;
		sort = data.sort ?? 'nombre';
		direction = (data.direction ?? 'asc') as typeof direction;
	});

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (categoriaFilter) params.set('categoria', String(categoriaFilter));
		if (currentPage > 1) params.set('page', currentPage.toString());
		if (sort !== 'nombre') params.set('sort', sort);
		if (direction !== 'asc') params.set('direction', direction);
		goto(resolve(`/productos?${params.toString()}`));
	}

	function handleSort(key: string) {
		if (!['nombre', 'codigo', 'precio_base'].includes(key)) return;
		const sortKey = key as typeof sort;
		if (sort === sortKey) direction = direction === 'asc' ? 'desc' : 'asc';
		else {
			sort = sortKey;
			direction = 'asc';
		}
		currentPage = 1;
		handleSearchChange();
	}

	async function deleteProducto(id: number) {
		if (confirm('¿Eliminar este producto?')) {
			try {
				await eliminarProducto(id);
				toast.success('Producto eliminado');
			} catch (error) {
				console.log(error);
				toast.error('Error al eliminar producto');
			}
		}
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
				value={categoriaFilter}
				class="select select-sm w-48"
				onchange={(e) => {
					categoriaFilter = Number(e.currentTarget.value);
					currentPage = 1;
					handleSearchChange();
				}}
			>
				<option value={0}>Todas las categorías</option>
				{#each categorias as cat (cat.id)}
					<option value={cat.id}>{cat.nombre}</option>
				{/each}
			</select>
		</div>
		<Can modulo="productos" accion="create">
			<a class="btn btn-sm btn-primary" href={resolve('/productos/crear')}>+ Nuevo Producto</a>
		</Can>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header(onSort: ((key: string) => void) | undefined)}
				<th><button class="link" onclick={() => onSort?.('codigo')}>Código</button></th>
				<th><button class="link" onclick={() => onSort?.('nombre')}>Nombre</button></th>
				<th>Categoría</th>
				<th>Marca</th>
				<th>Modelo</th>
				<th class="text-right"
					><button class="link" onclick={() => onSort?.('precio_base')}>Precio Base</button></th
				>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(producto: (typeof data.productos)[number])}
				<td class="font-mono text-sm"><Highlight text={producto.codigo} query={search} /></td>
				<td class="font-medium"><Highlight text={producto.nombre} query={search} /></td>
				<td
					>{categorias.find((c: (typeof categorias)[number]) => c.id === producto.categoria_id)
						?.nombre || '-'}</td
				>
				<td><Highlight text={producto.marca?.nombre} query={search} /></td>
				<td><Highlight text={producto.modelo?.nombre} query={search} /></td>
				<td class="text-right">
					{producto.precio_base ? `$${producto.precio_base.toLocaleString()}` : '-'}
				</td>
				<td class="text-center">
					<div class="flex justify-center gap-2">
						<Can modulo="productos" accion="edit">
							<a
								class="btn btn-circle btn-ghost btn-sm"
								href={resolve(`/productos/${producto.id}`)}
							>
								<Edit />
							</a>
						</Can>
						<Can modulo="productos" accion="delete">
							<button
								class="btn btn-circle btn-ghost text-error btn-sm"
								onclick={() => deleteProducto(producto.id)}
							>
								<Delete />
							</button>
						</Can>
					</div>
				</td>
			{/snippet}

			<Table
				data={data.productos}
				loading={false}
				emptyMessage="No hay productos registrados"
				{header}
				{row}
				onSort={handleSort}
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
