<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Table, Modal, FormFieldWrapper, SearchBar, Pagination } from '$lib/components/ui';
	import type { PageProps } from './$types';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { Delete, Edit, Eye } from '$lib/components/ui/icons';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import { createCliente, deleteCliente, updateCliente } from '$lib/remote/clientes.remote';
	import type { Cliente } from '$lib/server/db/schema';
	import { toast } from '$lib/stores/toast.svelte';
	import { debounce } from '$lib/utils';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { data }: PageProps = $props();

	// Estado local para UI
	let search = $derived(data.search);
	let currentPage = $derived(data.currentPage);
	let showModal = $state(false);
	let editingCliente: Cliente | null = $state(null);

	const createForm = createCliente;
	const updateForm = updateCliente;
	const activeForm = $derived(editingCliente ? updateForm : createForm);

	function resetForm() {
		editingCliente = null;
	}

	function editarCliente(cliente: Cliente) {
		editingCliente = cliente;
		showModal = true;
	}

	function onModalClose() {
		showModal = false;
		resetForm();
	}

	// Navegar cuando cambia búsqueda o página
	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (currentPage > 1) params.set('page', currentPage.toString());
		goto(resolve(`/clientes?${params.toString()}`));
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="w-full sm:w-64">
			<SearchBar autofocus bind:search oninput={() => debounce(handleSearchChange)} />
		</div>
		<button
			class="btn btn-primary"
			onclick={() => {
				resetForm();
				showModal = true;
			}}
		>
			+ Nuevo Cliente
		</button>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>Nombre</th>
				<th>Apellido</th>
				<th>Razón Social</th>
				<th>Teléfono</th>
				<th>CUIT</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(cliente: Cliente)}
				<td class="font-medium">{cliente.nombre}</td>
				<td>{cliente.apellido || '-'}</td>
				<td>{cliente.razon_social || '-'}</td>
				<td>{cliente.telefono || '-'}</td>
				<td>{cliente.cuit || '-'}</td>
				<td class="text-center">
					<div class="flex justify-center gap-2">
						<a
							class="btn btn-circle btn-ghost btn-sm"
							title="Ver cliente"
							href={resolve(`/clientes/${cliente.id}`)}
						>
							<Eye />
						</a>
						<button
							class="btn btn-circle btn-ghost btn-sm"
							title="Editar"
							onclick={() => editarCliente(cliente)}
						>
							<Edit />
						</button>
						<button
							class="btn btn-circle btn-ghost text-error btn-sm"
							title="Eliminar"
							onclick={async () => {
								if (confirm('¿Eliminar este cliente?')) {
									try {
										await deleteCliente(cliente.id);
										toast.success('Cliente eliminado');
										handleSearchChange(); // Recargar
									} catch (error) {
										console.log(error);

										toast.error('Error al eliminar cliente');
									}
								}
							}}
						>
							<Delete />
						</button>
					</div>
				</td>
			{/snippet}

			<Table
				data={data.clientes}
				loading={false}
				emptyMessage="No hay clientes registrados"
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

<Modal
	bind:open={showModal}
	title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
	onClose={onModalClose}
>
	<form
		{...activeForm.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success(editingCliente ? 'Cliente actualizado' : 'Cliente creado');
					onModalClose();
					handleSearchChange(); // Recargar la lista de clientes
				} else {
					toast.error('Error de validación');
				}
			} catch (error) {
				console.log(error);
				toast.error('Error del servidor');
			}
		})}
		id="cliente-form"
	>
		{#if editingCliente}
			<input type="hidden" name="id" value={editingCliente.id} />
		{/if}
		<fieldset class="fieldset rounded-lg border p-4">
			<legend class="text-md fieldset-legend px-2 font-semibold">Datos</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper id="nombre" label="Nombre" required>
					<input
						class="input"
						{...activeForm.fields?.nombre?.as('text', editingCliente?.nombre || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="apellido" label="Apellido" required>
					<input
						class="input"
						{...activeForm.fields?.apellido?.as('text', editingCliente?.apellido || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="razon_social" label="Razón Social">
					<input
						class="input"
						{...activeForm.fields?.razon_social?.as('text', editingCliente?.razon_social || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="cuit" label="CUIT">
					<input
						class="input"
						{...activeForm.fields?.cuit?.as('text', editingCliente?.cuit || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="email" label="Email">
					<input
						class="input"
						{...activeForm.fields?.email?.as('text', editingCliente?.email || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="telefono" label="Teléfono">
					<input
						class="input"
						{...activeForm.fields?.telefono?.as('text', editingCliente?.telefono || '')}
					/>
				</FormFieldWrapper>
			</div>
		</fieldset>
		<FormDireccion form={activeForm} initialData={editingCliente} />
	</form>
	{#each activeForm.fields?.allIssues?.() as issue (issue)}
		<p class="mt-1 text-sm text-error">{issue.message}</p>
	{/each}
	{#snippet actions()}
		<button class="btn" onclick={onModalClose}>Cancelar</button>
		<button
			type="submit"
			class="btn btn-primary"
			form="cliente-form"
			disabled={!!activeForm.pending}
		>
			{activeForm.pending ? 'Guardando...' : editingCliente ? 'Actualizar' : 'Guardar'}
		</button>
	{/snippet}
</Modal>
