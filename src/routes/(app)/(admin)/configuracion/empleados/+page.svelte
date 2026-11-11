<script lang="ts">
	import { FormErrors, FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import {
		getEmpleados,
		crearEmpleado,
		actualizarEmpleado,
		eliminarEmpleado
	} from '$lib/remote/empleados.remote';
	import { confirmarYEjecutar } from '$lib/stores/confirmacion.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	type Empleado = Awaited<ReturnType<typeof getEmpleados>>[number];

	let empleados = getEmpleados();
	let abierto = $state(false);
	let editando = $state<Empleado | null>(null);
	let activeForm = $derived(editando ? actualizarEmpleado : crearEmpleado);

	function abrir(empleado: Empleado | null) {
		editando = empleado;
		abierto = true;
	}

	function cerrarModal() {
		abierto = false;
		editando = null;
	}
</script>

<PageLayout>
	<div class="flex justify-end">
		<button class="btn btn-primary btn-sm" onclick={() => abrir(null)}>+ Nuevo empleado</button>
	</div>

	<div>
		{#snippet header()}
			<th>Nombre</th>
			<th>Apellido</th>
			<th>Teléfono</th>
			<th class="text-center">Acciones</th>
		{/snippet}

		{#snippet row(empleado: Awaited<typeof empleados>[number])}
			<td class="font-medium">{empleado.nombre}</td>
			<td>{empleado.apellido}</td>
			<td>{empleado.telefono || '-'}</td>
			<td class="text-center">
				<div class="flex justify-center gap-2">
					<button
						class="btn btn-circle btn-ghost btn-sm"
						title="Editar"
						onclick={() => abrir(empleado)}
					>
						<Edit />
					</button>
					<button
						class="btn btn-circle btn-ghost text-error btn-sm"
						title="Eliminar"
						onclick={() =>
							confirmarYEjecutar({
								mensaje: `¿Eliminar a ${empleado.nombre} ${empleado.apellido}?`,
								ejecutar: () => eliminarEmpleado(String(empleado.id)),
								exito: 'Empleado eliminado'
							})}
					>
						<Delete />
					</button>
				</div>
			</td>
		{/snippet}

		<Table data={await empleados} {header} {row} />
	</div>
</PageLayout>

<Modal
	bind:open={abierto}
	ancho="lg"
	titulo={editando ? 'Editar empleado' : 'Nuevo empleado'}
	alCerrar={cerrarModal}
	accion={{
		etiqueta: editando ? 'Guardar cambios' : 'Crear empleado',
		form: 'empleado-form',
		pendiente: !!activeForm.pending
	}}
>
	<form
		{...activeForm.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success(editando ? 'Empleado actualizado' : 'Empleado creado');
					form.element.reset();
					cerrarModal();
				} else {
					toast.error('Revisá los datos del empleado');
				}
			} catch {
				toast.error('No se pudo guardar el empleado');
			}
		})}
		id="empleado-form"
	>
		{#if editando}
			<input type="hidden" name="id" value={editando.id} />
		{/if}
		<div class="grid gap-4 sm:grid-cols-2">
			<FormFieldWrapper id="nombre" label="Nombre" required>
				<input class="input" {...activeForm.fields?.nombre?.as('text', editando?.nombre || '')} />
			</FormFieldWrapper>
			<FormFieldWrapper id="apellido" label="Apellido" required>
				<input
					class="input"
					{...activeForm.fields?.apellido?.as('text', editando?.apellido || '')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper id="email" label="Email">
				<input class="input" {...activeForm.fields?.email?.as('email', editando?.email || '')} />
			</FormFieldWrapper>
			<FormFieldWrapper id="telefono" label="Teléfono">
				<input
					class="input"
					{...activeForm.fields?.telefono?.as('text', editando?.telefono || '')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper id="dni" label="DNI">
				<input class="input" {...activeForm.fields?.dni?.as('text', editando?.dni || '')} />
			</FormFieldWrapper>
			<FormFieldWrapper id="fecha_ingreso" label="Fecha de ingreso">
				<input
					class="input"
					{...activeForm.fields?.fecha_ingreso?.as(
						'date',
						editando?.fecha_ingreso
							? new Date(editando?.fecha_ingreso)?.toISOString().split('T')[0]
							: new Date().toISOString().split('T')[0]
					)}
				/>
			</FormFieldWrapper>
		</div>
		<FormDireccion form={activeForm} initialData={editando ?? undefined} />
		<FormErrors form={activeForm} />
	</form>
</Modal>
