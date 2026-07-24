<script lang="ts">
	import { resolve } from '$app/paths';
	import { FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import {
		getEmpleados,
		crearEmpleado,
		actualizarEmpleado,
		eliminarEmpleado
	} from '$lib/remote/empleados.remote';
	import { toast } from '$lib/stores/toast.svelte';

	let empleados = getEmpleados();
	let showModal = $state(false);
	let editingEmpleado = $state(null);
	let activeForm = $derived(editingEmpleado ? actualizarEmpleado : crearEmpleado);

	function abrirModal(empleado?: any) {
		editingEmpleado = empleado || null;
		showModal = true;
	}

	function cerrarModal() {
		showModal = false;
		editingEmpleado = null;
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<a href={resolve('/configuracion')} class="btn btn-ghost btn-sm">← Volver</a>
		<button class="btn btn-primary" onclick={() => abrirModal()}> + Nuevo Empleado </button>
	</div>

	<div>
		{#snippet header()}
			<th>Nombre</th>
			<th>Apellido</th>
			<th>Teléfono</th>
			<th class="text-center">Acciones</th>
		{/snippet}

		{#snippet row(empleado)}
			<td class="font-medium">{empleado.nombre}</td>
			<td>{empleado.apellido}</td>
			<td>{empleado.telefono || '-'}</td>
			<td class="text-center">
				<div class="flex justify-center gap-2">
					<button
						class="btn btn-circle btn-ghost btn-sm"
						title="Editar"
						onclick={() => abrirModal(empleado)}
					>
						<Edit />
					</button>
					<button
						class="btn btn-circle text-error btn-ghost btn-sm"
						title="Eliminar"
						onclick={async () => {
							if (confirm('¿Eliminar este empleado?')) {
								try {
									await eliminarEmpleado(empleado.id);
									toast.success('Empleado eliminado');
								} catch (error) {
									console.log(error);

									toast.error('Error al eliminar empleado');
								}
							}
						}}
					>
						<Delete />
					</button>
				</div>
			</td>
		{/snippet}

		<Table data={await empleados} {header} {row} />
	</div>
</PageLayout>

<!-- Modal para crear/editar empleado -->
<Modal
	bind:open={showModal}
	title={editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
	onClose={cerrarModal}
>
	<form
		{...activeForm.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success(editingEmpleado ? 'Empleado actualizado' : 'Empleado creado');
					form.element.reset();
					cerrarModal();
				} else {
					toast.error('Error de validación');
				}
			} catch (error) {
				console.log(error);

				toast.error('Error del servidor');
			}
		})}
		id="empleado-form"
	>
		{#if editingEmpleado}
			<input type="hidden" name="id" value={editingEmpleado.id} />
		{/if}

		<fieldset class="fieldset rounded-lg border p-4">
			<legend class="text-md fieldset-legend px-2 font-semibold">Datos personales</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper id="nombre" label="Nombre" required>
					<input
						class="input"
						{...activeForm.fields?.nombre?.as('text', editingEmpleado?.nombre || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="apellido" label="Apellido" required>
					<input
						class="input"
						{...activeForm.fields?.apellido?.as('text', editingEmpleado?.apellido || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="email" label="Email">
					<input
						class="input"
						{...activeForm.fields?.email?.as('email', editingEmpleado?.email || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="telefono" label="Teléfono">
					<input
						class="input"
						{...activeForm.fields?.telefono?.as('text', editingEmpleado?.telefono || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="dni" label="DNI">
					<input
						class="input"
						{...activeForm.fields?.dni?.as('text', editingEmpleado?.dni || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="fecha_ingreso" label="Fecha de ingreso">
					<input
						class="input"
						{...activeForm.fields?.fecha_ingreso?.as('date', editingEmpleado?.fecha_ingreso || '')}
					/>
				</FormFieldWrapper>
			</div>
		</fieldset>

		<FormDireccion form={activeForm} initialData={editingEmpleado || undefined} />
	</form>

	{#each activeForm.fields?.allIssues?.() as issue (issue)}
		<p class="mt-1 text-sm text-error">{issue.message}</p>
	{/each}

	{#snippet actions()}
		<button class="btn" onclick={cerrarModal}>Cancelar</button>
		<button
			type="submit"
			class="btn btn-primary"
			form="empleado-form"
			disabled={!!activeForm.pending}
		>
			{activeForm.pending ? 'Guardando...' : editingEmpleado ? 'Actualizar' : 'Guardar'}
		</button>
	{/snippet}
</Modal>
