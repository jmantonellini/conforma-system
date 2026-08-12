<script lang="ts">
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

	let modal = $state<{
		open: boolean;
		tipo: 'crear' | 'editar' | 'eliminar';
		titulo: string;
		empleado: any;
	}>({ open: false, tipo: 'crear', titulo: '', empleado: null });

	let activeForm = $derived(modal.empleado ? actualizarEmpleado : crearEmpleado);

	function abrirCrear() {
		modal = { open: true, tipo: 'crear', titulo: 'Nuevo Empleado', empleado: null };
	}

	function abrirEditar(empleado: any) {
		modal = { open: true, tipo: 'editar', titulo: 'Editar Empleado', empleado };
	}

	function abrirEliminar(empleado: any) {
		modal = { open: true, tipo: 'eliminar', titulo: 'Eliminar Empleado', empleado };
	}

	function cerrarModal() {
		modal.open = false;
		modal.empleado = null;
	}

	async function confirmarEliminar() {
		if (!modal.empleado) return;
		try {
			await eliminarEmpleado(modal.empleado.id);
			toast.success('Empleado eliminado');
			cerrarModal();
		} catch (error) {
			console.log(error);
			toast.error('Error al eliminar empleado');
		}
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>
		<button class="btn btn-primary" onclick={abrirCrear}> + Nuevo Empleado </button>
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
						onclick={() => abrirEditar(empleado)}
					>
						<Edit />
					</button>
					<button
						class="btn btn-circle btn-ghost text-error btn-sm"
						title="Eliminar"
						onclick={() => abrirEliminar(empleado)}
					>
						<Delete />
					</button>
				</div>
			</td>
		{/snippet}

		<Table data={await empleados} {header} {row} />
	</div>
</PageLayout>

<Modal bind:open={modal.open} title={modal.titulo} onClose={cerrarModal}>
	{#if modal.tipo === 'eliminar'}
		<p>
			¿Eliminar a <strong>{modal.empleado?.nombre} {modal.empleado?.apellido}</strong>?
		</p>
	{:else}
		<form
			{...activeForm.enhance(async (form) => {
				try {
					if (await form.submit()) {
						toast.success(modal.tipo === 'editar' ? 'Empleado actualizado' : 'Empleado creado');
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
			{#if modal.empleado}
				<input type="hidden" name="id" value={modal.empleado.id} />
			{/if}

			<fieldset class="fieldset rounded-lg border p-4">
				<legend class="text-md fieldset-legend px-2 font-semibold">Datos personales</legend>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormFieldWrapper id="nombre" label="Nombre" required>
						<input
							class="input"
							{...activeForm.fields?.nombre?.as('text', modal.empleado?.nombre || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="apellido" label="Apellido" required>
						<input
							class="input"
							{...activeForm.fields?.apellido?.as('text', modal.empleado?.apellido || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="email" label="Email">
						<input
							class="input"
							{...activeForm.fields?.email?.as('email', modal.empleado?.email || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="telefono" label="Teléfono">
						<input
							class="input"
							{...activeForm.fields?.telefono?.as('text', modal.empleado?.telefono || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="dni" label="DNI">
						<input
							class="input"
							{...activeForm.fields?.dni?.as('text', modal.empleado?.dni || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="fecha_ingreso" label="Fecha de ingreso">
						<input
							class="input"
							{...activeForm.fields?.fecha_ingreso?.as(
								'date',
								new Date(modal.empleado.fecha_ingreso).toISOString().split('T')[0] || ''
							)}
						/>
						<!-- {modal.empleado?.fecha_ingreso} -->
					</FormFieldWrapper>
				</div>
			</fieldset>

			<FormDireccion form={activeForm} initialData={modal.empleado || undefined} />
		</form>

		{#each activeForm.fields?.allIssues?.() as issue (issue)}
			<p class="mt-1 text-sm text-error">{issue.message}</p>
		{/each}
	{/if}
	{#snippet actions()}
		{#if modal.tipo === 'eliminar'}
			<button class="btn" onclick={cerrarModal}>Cancelar</button>
			<button class="btn btn-error" onclick={confirmarEliminar}>Eliminar</button>
		{:else}
			<button class="btn" onclick={cerrarModal}>Cancelar</button>
			<button
				type="submit"
				class="btn btn-primary"
				form="empleado-form"
				disabled={!!activeForm.pending}
			>
				{activeForm.pending ? 'Guardando...' : modal.tipo === 'editar' ? 'Actualizar' : 'Guardar'}
			</button>
		{/if}
	{/snippet}
</Modal>
