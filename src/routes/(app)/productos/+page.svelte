<script lang="ts">
	import { getProductos, eliminarProducto, getCategorias } from '$lib/remote/productos.remote';
	import { Table, SearchBar, PageHeader, Pagination } from '$lib/components/ui';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import { resolve } from '$app/paths';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import { debounce } from '$lib/utils';
	import type { Producto } from '$lib/server/db/schema';

	let search = $state('');
	let needSuggestionsFor = $state<string | undefined>(undefined); // value to find suggestions for

	let categoriaFilter = $state<number | undefined>(undefined);
	let currentPage = $state(1);

	let categorias = $derived(await getCategorias());

	async function deleteProducto(producto: Producto) {
		if (confirm('¿Eliminar este producto?')) {
			await eliminarProducto(producto.id);
		}
	}

	function handleSearchChange() {
		needSuggestionsFor = search === '' ? undefined : search;
		currentPage = 1;
	}
</script>

<PageLayout>
	<PageHeader title="Productos" description="Gestiona los productos de la empresa" />

	<!-- Barra de búsqueda y filtros -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-4">
			<div class="w-full sm:w-80">
				<SearchBar bind:search oninput={() => debounce(handleSearchChange)} />
			</div>

			<select bind:value={categoriaFilter} class="select w-48">
				<option value={undefined}>Todas las categorías</option>
				{#each categorias as cat (cat.id)}
					<option value={cat.id}>{cat.nombre}</option>
				{/each}
			</select>
		</div>

		<a class="btn btn-primary" href={resolve('/productos/crear')}> + Nuevo Producto </a>
	</div>

	<svelte:boundary>
	{let { data, totalPages } = $derived(
		await getProductos({
			search: needSuggestionsFor,
			categoriaId: categoriaFilter,
			page: currentPage
		})
	);}
		{#snippet pending()}
			<div class="flex justify-center py-8">
				<span class="loading loading-lg loading-spinner"></span>
			</div>
		{/snippet}
		{#if $effect.pending()}
			<div class="flex justify-center py-8">
				<span class="loading loading-lg loading-spinner"></span>
			</div>
		{:else}
			<!-- Tabla -->
			<div class="card bg-base-100 shadow">
				<div class="card-body p-0">
					{#snippet header()}
						<th>Código</th>
						<th>Nombre</th>
						<th>Categoría</th>
						<th class="text-right">Precio Base</th>
						<th class="text-center">Acciones</th>
					{/snippet}

					{#snippet row(producto: Producto)}
						<td class="font-mono text-sm">{producto.codigo}</td>
						<td class="font-medium">{producto.nombre}</td>
						<td>{categorias.find((c) => c.id === producto.categoria_id)?.nombre || '-'}</td>
						<td class="text-right">
							{producto.precio_base ? `$${producto.precio_base.toLocaleString()}` : '-'}
						</td>
						<td class="text-center">
							<div class="flex justify-center gap-2">
								<a class="btn btn-ghost btn-sm" href={resolve(`/productos/${producto.id}`)}
									><Edit /></a
								>
								<button
									class="btn text-error btn-ghost btn-sm"
									onclick={() => deleteProducto(producto)}><Delete /></button
								>
							</div>
						</td>
					{/snippet}

					<Table {data} loading={false} emptyMessage="No hay productos registrados" {header} {row} />
				</div>
			</div>
			<!-- Paginación -->
			{#if totalPages > 1}
				<div class="mt-6 flex justify-center">
					<Pagination {currentPage} {totalPages} onPageChange={(page) => (currentPage = page)} />
				</div>
			{/if}
		{/if}
		
	</svelte:boundary>
</PageLayout>
