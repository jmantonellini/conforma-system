<!-- src/routes/clientes/+page.svelte -->
<script lang="ts">
	import { Table, Modal, FormField, SearchBar, PageHeader, Pagination } from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import {
		createCliente,
		deleteCliente,
		getClientes,
		updateCliente
	} from '$lib/remote/clientes.remote';
	import type { Cliente } from '$lib/server/db/schema';

	let search = $state('');
	let currentPage = $state(1);
	let showModal = $state(false);
	let editingCliente: Cliente | null = $state(null);

	const createForm = createCliente;
	const updateForm = updateCliente;

	const activeForm = $derived(editingCliente ? updateForm : createForm);

	// Estado del formulario

	// Cargar datos reactivamente
	let clientesData = $derived(await getClientes({ search, page: currentPage }));

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

	// Manejar éxito del form
	$effect(() => {
		if (activeForm.result?.success) {
			showModal = false;
			resetForm();
			getClientes({ search, page: currentPage }).then((data) => {
				clientesData = data;
			});
		}
	});
</script>

<PageLayout>
	<PageHeader title="Clientes" description="Gestiona los clientes de la empresa" />

	<!-- Barra de búsqueda y botón nuevo -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="w-full sm:w-96">
			<SearchBar bind:search />
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

	<!-- Tabla de clientes -->
	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>Nombre</th>
				<th>Email</th>
				<th>Teléfono</th>
				<th>CUIT</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(cliente: Cliente)}
				<td class="font-medium">{cliente.nombre}</td>
				<td>{cliente.email || '-'}</td>
				<td>{cliente.telefono || '-'}</td>
				<td>{cliente.cuit || '-'}</td>
				<td class="text-center">
					<div class="flex justify-center gap-2">
						<button
							class="btn btn-ghost btn-sm"
							title="Editar"
							onclick={() => editarCliente(cliente)}
						>
							✏️
						</button>
						<button
							class="btn text-error btn-ghost btn-sm"
							title="Eliminar"
							onclick={() => {
								if (confirm('¿Eliminar este cliente?')) {
									(async () => {
										try {
											await deleteCliente({ id: cliente.id });
										} catch (error) {
											console.error('Error al eliminar cliente:', error);
											alert('No se pudo eliminar el cliente');
										}
									})();
								}
							}}
						>
							🗑️
						</button>
					</div>
				</td>
			{/snippet}

			<Table
				data={clientesData.data}
				loading={false}
				emptyMessage="No hay clientes registrados"
				{header}
				{row}
			/>
		</div>
	</div>

	<!-- Paginación -->
	{#if clientesData.totalPages > 1}
		<div class="mt-6 flex justify-center">
			<Pagination
				currentPage={clientesData.currentPage}
				totalPages={clientesData.totalPages}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</PageLayout>

<!-- Modal para crear/editar cliente -->
<Modal
	bind:open={showModal}
	title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
	onClose={onModalClose}
>
	<form {...activeForm} id="cliente-form">
		{#if editingCliente}
			<input type="hidden" name="id" value={editingCliente.id} />
		{/if}
		<fieldset class="fieldset rounded-lg border p-4">
			<legend class="text-md fieldset-legend px-2 font-semibold">Datos</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField
					id="nombre"
					label="Nombre"
					required
					{...activeForm.fields?.nombre?.as('text', editingCliente?.nombre || '')}
				/>
				<FormField
					id="razon-social"
					label="Razón Social"
					{...activeForm.fields?.razon_social?.as('text', editingCliente?.razon_social || '')}
				/>
				<FormField
					id="cuit"
					label="CUIT"
					{...activeForm.fields?.cuit?.as('text', editingCliente?.cuit || '')}
				/>
				<FormField
					id="email"
					label="Email"
					{...activeForm.fields?.email?.as('email', editingCliente?.email || '')}
				/>
				<FormField
					id="telefono"
					label="Teléfono"
					{...activeForm.fields?.telefono?.as('text', editingCliente?.telefono || '')}
				/>
			</div>
		</fieldset>
		<FormDireccion form={activeForm} initialData={editingCliente} />
	</form>
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
