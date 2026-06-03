<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import Table from '$lib/components/ui/Table.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let data: PageData = $props();

	let showModal = $state(false);
	let editingProducto = $state(null);
	let searchValue = $state(data.search || '');
	let categoriaFilter = $state(data.categoriaActual || '');
	let currentPage = $state(data.currentPage);

	let formData = $state({
		codigo: '',
		nombre: '',
		categoria_id: '',
		medidas_primario_diametro: '',
		medidas_primario_largo: '',
		medidas_secundario_diametro: '',
		medidas_secundario_largo: '',
		trombon_diametro_inicial: '',
		trombon_largo: '',
		trombon_observaciones: '',
		precio_base: '',
		es_personalizable: false
	});

	function resetForm() {
		formData = {
			codigo: '',
			nombre: '',
			categoria_id: '',
			medidas_primario_diametro: '',
			medidas_primario_largo: '',
			medidas_secundario_diametro: '',
			medidas_secundario_largo: '',
			trombon_diametro_inicial: '',
			trombon_largo: '',
			trombon_observaciones: '',
			precio_base: '',
			es_personalizable: false
		};
		editingProducto = null;
	}

	async function handleDelete(producto) {
		if (confirm('¿Eliminar este producto?')) {
			await fetch('?/delete', {
				method: 'POST',
				body: new FormData([['id', producto.id]])
			});
			window.location.href = '/productos';
		}
	}

	function handlePageChange(page: number) {
		const params = new SvelteURLSearchParams();
		if (searchValue) params.set('search', searchValue);
		if (categoriaFilter) params.set('categoria', categoriaFilter);
		params.set('page', page.toString());
		window.location.href = `/productos?${params.toString()}`;
	}

	function applyFilters() {
		const params = new SvelteURLSearchParams();
		if (searchValue) params.set('search', searchValue);
		if (categoriaFilter) params.set('categoria', categoriaFilter);
		params.set('page', '1');
		window.location.href = `/productos?${params.toString()}`;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">📋 Productos</h1>
		<button
			class="btn btn-primary"
			onclick={() => {
				resetForm();
				showModal = true;
			}}
		>
			+ Nuevo Producto
		</button>
	</div>

	<!-- Filters -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="flex flex-wrap gap-4">
				<div class="min-w-50 flex-1">
					<SearchBar bind:searchValue />
				</div>
				<select bind:value={categoriaFilter} class="select-bordered select w-48">
					<option value="">Todas las categorías</option>
					{#each data.categorias as cat (cat.id)}
						<option value={cat.id}>{cat.nombre}</option>
					{/each}
				</select>
				<button class="btn btn-primary" onclick={applyFilters}> Buscar </button>
			</div>
		</div>
	</div>

	<!-- Table -->
	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>Código</th>
				<th>Nombre</th>
				<th>Categoría</th>
				<th>Precio Base</th>
				<th>Acciones</th>
			{/snippet}

			{#snippet row(producto)}
				<td class="font-mono text-sm">{producto.codigo}</td>
				<td class="font-medium">{producto.nombre}</td>
				<td>
					{data.categorias.find((c) => c.id === producto.categoria_id)?.nombre || '-'}
				</td>
				<td class="text-right">
					{producto.precio_base ? `$${producto.precio_base.toLocaleString()}` : '-'}
				</td>
				<td class="space-x-2">
					<button
						class="btn btn-ghost btn-sm"
						onclick={() => {
							editingProducto = producto;
							formData = { ...producto };
							showModal = true;
						}}
					>
						✏️
					</button>
					<button class="btn text-error btn-ghost btn-sm" onclick={() => handleDelete(producto)}>
						🗑️
					</button>
				</td>
			{/snippet}

			<Table
				data={data.productos}
				loading={false}
				emptyMessage="No hay productos registrados"
				{header}
				{row}
			/>
		</div>
	</div>

	<!-- Pagination -->
	<div class="flex justify-center">
		<Pagination {currentPage} totalPages={data.totalPages} onPageChange={handlePageChange} />
	</div>
</div>

<!-- Modal de Producto -->
<Modal bind:open={showModal} title={editingProducto ? 'Editar Producto' : 'Nuevo Producto'}>
	<form
		method="POST"
		action={editingProducto ? `?/update` : `?/create`}
		use:enhance={() => {
			showModal = false;
			resetForm();
			setTimeout(() => window.location.reload(), 200);
		}}
	>
		<input type="hidden" name="id" value={editingProducto?.id || ''} />

		<div class="max-h-[70vh] space-y-4 overflow-y-auto px-2">
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Código" bind:value={formData.codigo} required />
				<FormField label="Nombre" bind:value={formData.nombre} required />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<label class="form-control">
					<div class="label"><span class="label-text">Categoría</span></div>
					<select bind:value={formData.categoria_id} class="select-bordered select">
						<option value="">Seleccionar...</option>
						{#each data.categorias as cat (cat.id)}
							<option value={cat.id}>{cat.nombre}</option>
						{/each}
					</select>
				</label>
				<FormField
					label="Precio Base"
					type="number"
					bind:value={formData.precio_base}
					step="0.01"
				/>
			</div>

			<fieldset class="rounded-lg border p-4">
				<legend class="px-2 font-bold">Medidas Primario</legend>
				<div class="grid grid-cols-2 gap-4">
					<FormField
						label="Diámetro"
						type="number"
						bind:value={formData.medidas_primario_diametro}
					/>
					<FormField label="Largo" type="number" bind:value={formData.medidas_primario_largo} />
				</div>
			</fieldset>

			<fieldset class="rounded-lg border p-4">
				<legend class="px-2 font-bold">Medidas Secundario</legend>
				<div class="grid grid-cols-2 gap-4">
					<FormField
						label="Diámetro"
						type="number"
						bind:value={formData.medidas_secundario_diametro}
					/>
					<FormField label="Largo" type="number" bind:value={formData.medidas_secundario_largo} />
				</div>
			</fieldset>

			<fieldset class="rounded-lg border p-4">
				<legend class="px-2 font-bold">Trombon</legend>
				<div class="grid grid-cols-2 gap-4">
					<FormField
						label="Diámetro Inicial"
						type="number"
						bind:value={formData.trombon_diametro_inicial}
					/>
					<FormField label="Largo" type="number" bind:value={formData.trombon_largo} />
				</div>
				<FormField
					label="Observaciones"
					bind:value={formData.trombon_observaciones}
					textarea
					rows={2}
				/>
			</fieldset>

			<div class="form-control">
				<label class="label cursor-pointer justify-start gap-4">
					<span class="label-text font-semibold">Personalizable</span>
					<input
						type="checkbox"
						bind:checked={formData.es_personalizable}
						class="checkbox checkbox-primary"
					/>
				</label>
			</div>
		</div>
	</form>
	{#snippet actions()}
		<button
			type="submit"
			formmethod="POST"
			formaction={editingProducto ? `?/update` : `?/create`}
			class="btn btn-primary"
		>
			{editingProducto ? 'Actualizar' : 'Guardar'}
		</button>
	{/snippet}
</Modal>
