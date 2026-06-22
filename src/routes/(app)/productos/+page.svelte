<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Table, SearchBar, PageHeader, Pagination } from '$lib/components/ui';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import { eliminarProducto } from '$lib/remote/productos.remote';
	import type { PageProps } from './$types';
	import { toast } from '$lib/stores/toast.svelte';
	import { debounce } from '$lib/utils';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { Producto } from '$lib/server/db/schema';
	import { page } from '$app/state';

	let { data }: PageProps = $props();

	let search = $derived(data.search);
	let categoriaFilter = $derived(data.categoriaFilter ?? 0);
	let currentPage = $derived(data.currentPage);
	let categorias = page.data.categorias;

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (categoriaFilter) params.set('categoria', String(categoriaFilter));
		if (currentPage > 1) params.set('page', currentPage.toString());
		goto(resolve(`/productos?${params.toString()}`));
	}

	async function deleteProducto(id: number) {
		if (confirm('¿Eliminar este producto?')) {
			try {
				await eliminarProducto(id).then(() => handleSearchChange());
				toast.success('Producto eliminado');
			} catch (error) {
				console.log(error);
				toast.error('Error al eliminar producto');
			}
		}
	}
</script>

<PageLayout>
	<PageHeader title="Productos" description="Gestiona los productos de la empresa" />

	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-4">
			<div class="w-full sm:w-64">
				<SearchBar autofocus bind:search oninput={() => debounce(handleSearchChange)} />
			</div>
			<select
				value={categoriaFilter}
				class="select w-48"
				onchange={(e) => {
					categoriaFilter = Number(e.currentTarget.value);
					handleSearchChange();
				}}
			>
				<option value={0}>Todas las categorías</option>
				{#each categorias as cat (cat.id)}
					<option value={cat.id}>{cat.nombre}</option>
				{/each}
			</select>
		</div>
		<a class="btn btn-primary" href={resolve('/productos/crear')}>+ Nuevo Producto</a>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>Código</th>
				<th>Nombre</th>
				<th>Categoría</th>
				<th>Marca</th>
				<th>Modelo</th>
				<th class="text-right">Precio Base</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(producto)}
				<td class="font-mono text-sm">{producto.codigo}</td>
				<td class="font-medium">{producto.nombre}</td>
				<td>{categorias.find((c) => c.id === producto.categoria_id)?.nombre || '-'}</td>
				<td>{producto.marca?.nombre}</td>
				<td>{producto.modelo?.nombre}</td>
				<td class="text-right">
					{producto.precio_base ? `$${producto.precio_base.toLocaleString()}` : '-'}
				</td>
				<td class="text-center">
					<div class="flex justify-center gap-2">
						<a class="btn btn-circle btn-ghost btn-sm" href={resolve(`/productos/${producto.id}`)}>
							<Edit />
						</a>
						<button
							class="btn btn-circle text-error btn-ghost btn-sm"
							onclick={() => deleteProducto(producto.id)}
						>
							<Delete />
						</button>
					</div>
				</td>
			{/snippet}

			<Table
				data={data.productos}
				loading={false}
				emptyMessage="No hay productos registrados"
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
