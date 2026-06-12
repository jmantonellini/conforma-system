<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Table,
		Modal,
		FormFieldWrapper,
		SearchBar,
		PageHeader,
		Pagination
	} from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { Delete, Edit, Eye } from '$lib/components/ui/icons';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import {
		createCliente,
		deleteCliente,
		getClientes,
		updateCliente
	} from '$lib/remote/clientes.remote';
	import type { Cliente } from '$lib/server/db/schema';
	import { toast } from '$lib/toast/toast.svelte';
	import { debounce } from '$lib/utils';

	let currentPage = $state(1);
	let showModal = $state(false);
	let editingCliente: Cliente | null = $state(null);

	const createForm = createCliente;
	const updateForm = updateCliente;

	const activeForm = $derived(editingCliente ? updateForm : createForm);

	let search = $state(''); // Your input content
	let needSuggestionsFor = $state(''); // value to find suggestions for

	function resetForm() {
		editingCliente = null;
	}

	function editarCliente(cliente: Cliente) {
		showModal = true;
		editingCliente = cliente;
	}

	function onModalClose() {
		showModal = false;
		resetForm();
	}

	function handleSearchChange() {
		needSuggestionsFor = search;
	}
</script>

<PageLayout>
	<PageHeader title="Clientes" description="Gestiona los clientes de la empresa" />

	<!-- Barra de búsqueda y botón nuevo -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="w-full sm:w-96">
			<SearchBar bind:search oninput={() => debounce(handleSearchChange)} />
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
					<th>Razón Social</th>
					<th>Teléfono</th>
					<th>CUIT</th>
					<th class="text-center">Acciones</th>
				{/snippet}

				{#snippet row(cliente: Cliente)}
					<td class="font-medium">{cliente.nombre}</td>
					<td>{cliente.razon_social || '-'}</td>
					<td>{cliente.telefono || '-'}</td>
					<td>{cliente.cuit || '-'}</td>
					<td class="text-center">
						<div class="flex justify-center gap-2">
							<a
								class="btn btn-circle btn-ghost btn-sm"
								title="Ver cliente"
								href={resolve(`/clientes/${cliente.id}`)}>
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
								class="btn btn-circle text-error btn-ghost btn-sm"
								title="Eliminar"
								onclick={() => {
									if (confirm('¿Eliminar este cliente?')) {
										(async () => {
											try {
												await deleteCliente(cliente.id).then((promise) => {
													if (promise.success) {
														toast.success('Cliente eliminado');
													}
												});
											} catch (error) {
												console.log(error);
												toast.error('Error al eliminar cliente:');
											}
										})();
									}
								}}
							>
								<Delete />
							</button>
						</div>
					</td>
				{/snippet}
			<svelte:boundary>
				{let { data, totalPages } = $derived(await getClientes({ search: needSuggestionsFor, page: currentPage }));}
				{#if $effect.pending()}
				<div class="flex justify-center py-8">
							<span class="loading loading-lg loading-spinner"></span>
						</div>
				{:else}
				<Table {data} loading={false} emptyMessage="No hay clientes registrados" {header} {row} />
				<!-- Paginación -->
				{#if totalPages > 1}
					<div class="mt-6 flex justify-center">
						<Pagination {currentPage} {totalPages} onPageChange={(page) => (currentPage = page)} />
						</div>
						{/if}
						{/if}
						{#snippet pending()}
							<div class="flex justify-center py-8">
								<span class="loading loading-lg loading-spinner"></span>
							</div>
						{/snippet}
					</svelte:boundary>
			</div>
		</div>
</PageLayout>

<!-- Modal para crear/editar cliente -->
<Modal
	bind:open={showModal}
	title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
	onClose={onModalClose}
>
	<form
		{...activeForm.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success('Cliente creado!');
					form.element.reset();
				} else {
					toast.error('Error de validación');
				}
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (error) {
				toast.error('Error del servidor');
			}
		})}
		id="cliente-form"
	>
		{#if editingCliente}
			<input class="input" type="hidden" name="id" value={editingCliente.id} />
		{/if}
		<fieldset class="fieldset rounded-lg border p-4">
			<legend class="text-md fieldset-legend px-2 font-semibold">Datos</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper id="nombre" label="Nombre">
					<input
						class="input"
						required
						{...activeForm.fields?.nombre?.as('text', editingCliente?.nombre || '')}
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
						{...activeForm.fields?.email?.as('email', editingCliente?.email || '')}
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
