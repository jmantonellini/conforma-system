<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, Highlight, PageLayout, Pagination, SearchBar, Table } from '$lib/components/ui';
	import { debounce } from '$lib/utils/debounce';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { PageProps } from './$types';
	import { Delete, Edit, Eye } from '$lib/components/ui/icons';
	import { eliminarContacto } from '$lib/remote/contactos.remote';

	let { data }: PageProps = $props();
	let search = $state('');
	let filtroRol = $state('todos');
	let currentPage = $state(1);
	let sort = $state<'razon_social' | 'cuit' | 'email' | 'created_at'>('razon_social');
	let direction = $state<'asc' | 'desc'>('asc');

	$effect(() => {
		search = data.search ?? '';
		filtroRol = data.rolFilter ?? 'todos';
		currentPage = data.currentPage ?? 1;
		sort = (data.sort ?? 'razon_social') as typeof sort;
		direction = (data.direction ?? 'asc') as typeof direction;
	});

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (filtroRol !== 'todos') params.set('rol', filtroRol);
		if (currentPage > 1) params.set('page', currentPage.toString());
		if (sort !== 'razon_social') params.set('sort', sort);
		if (direction !== 'asc') params.set('direction', direction);
		goto(resolve(`/contactos?${params.toString()}`));
	}

	function handleSort(key: string) {
		if (!['razon_social', 'cuit', 'email', 'created_at'].includes(key)) return;
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
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-3">
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
				class="select select-sm w-48"
				aria-label="Filtrar contactos por rol"
				bind:value={filtroRol}
				onchange={() => {
					currentPage = 1;
					handleSearchChange();
				}}
			>
				<option value="todos">Todos</option>
				<option value="cliente">Clientes</option>
				<option value="proveedor">Proveedores</option>
				<option value="ambos">Clientes y proveedores</option>
			</select>
		</div>
		<a
			class="btn btn-primary btn-sm"
			href={resolve(filtroRol === 'cliente' ? '/contactos/crear?rol=cliente' : '/contactos/crear')}
		>
			{filtroRol === 'cliente' ? 'Nuevo cliente' : 'Nuevo contacto'}
		</a>
		<a class="btn btn-outline btn-sm" href={resolve('/contactos/importar')}>Excel</a>
	</div>
	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet contactoHeader(onSort: ((key: string) => void) | undefined)}
				<th><button class="link" onclick={() => onSort?.('razon_social')}>Razón social</button></th>
				<th><button class="link" onclick={() => onSort?.('cuit')}>CUIT</button></th>
				<th>Roles</th>
				<th><button class="link" onclick={() => onSort?.('email')}>Contacto</button></th>
				<th></th>
			{/snippet}
			{#snippet contactoRow(contacto: (typeof data.contactos)[number])}
				<td class="font-medium"><Highlight text={contacto.razon_social} query={search} /></td>
				<td><Highlight text={contacto.cuit || '-'} query={search} /></td>
				<td>
					<div class="flex flex-wrap gap-1">
						{#if contacto.es_cliente}<span class="badge badge-sm badge-info">Cliente</span>{/if}
						{#if contacto.es_distribuidor}<span class="badge badge-sm badge-primary"
								>Distribuidor</span
							>{/if}
						{#if contacto.es_proveedor}<span class="badge badge-sm badge-success">Proveedor</span
							>{/if}
						{#if !contacto.es_cliente && !contacto.es_distribuidor && !contacto.es_proveedor}<span
								class="badge badge-ghost badge-sm">Sin rol</span
							>{/if}
					</div>
				</td>
				<td><Highlight text={contacto.email || contacto.telefono || '-'} query={search} /></td>
				<td class="flex items-center justify-end gap-1">
					<button
						class="btn btn-circle btn-ghost btn-sm"
						title="Ver"
						onclick={() => goto(resolve(`/contactos/${contacto.id}`))}
					>
						<Eye />
					</button>
					<Can modulo="contactos" accion="edit">
						<button
							class="btn btn-circle btn-ghost btn-sm"
							title="Editar"
							onclick={() => goto(resolve(`/contactos/${contacto.id}`))}
						>
							<Edit />
						</button>
					</Can>
					<Can modulo="contactos" accion="delete">
						<button
							class="btn btn-circle btn-ghost btn-error btn-sm"
							title="Eliminar"
							onclick={async () => {
								if (!confirm(`¿Eliminar el contacto "${contacto.nombre} ${contacto.apellido}"?`))
									return;
								try {
									await eliminarContacto(contacto.id);
									await goto(resolve('/contactos'), { invalidateAll: true, replaceState: true });
								} catch {
									alert('No se pudo eliminar el contacto');
								}
							}}
						>
							<Delete />
						</button>
					</Can>
				</td>
			{/snippet}
			<Table
				data={data.contactos}
				header={contactoHeader}
				row={contactoRow}
				emptyMessage="No hay contactos"
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
	</div></PageLayout
>
