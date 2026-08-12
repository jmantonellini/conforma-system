<script lang="ts">
	import { FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import { Delete, Edit } from '$lib/components/ui/icons';
	import { getEmpleadosSinUsuario } from '$lib/remote/empleados.remote';
	import { getRoles } from '$lib/remote/roles.remote';
	import {
		actualizarUsuario,
		crearUsuario,
		deleteUsuario,
		getUsuarios
	} from '$lib/remote/usuarios.remote';
	import { toast } from '$lib/stores/toast.svelte';

	let usuarios = getUsuarios();
	let roles = await getRoles();
	let empleados = await getEmpleadosSinUsuario();
	let showModal = $state(false);
	let editingUsuario = $state(null);
	let activeForm = $derived(editingUsuario ? actualizarUsuario : crearUsuario);
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>

		<button
			class="btn btn-primary"
			onclick={() => {
				showModal = true;
				editingUsuario = null;
			}}
		>
			+ Nuevo Usuario
		</button>
	</div>
	<div>
		{#snippet header()}
			<th>Username</th>
			<th>Rol</th>
			<th>Empleado</th>
			<th class="text-center">Acciones</th>
		{/snippet}

		{#snippet row(usuario)}
			<td class="font-medium">{usuario.username}</td>
			<td>{usuario.rol?.nombre}</td>
			<td>{usuario.empleado?.nombre}</td>
			<td class="text-center">
				<div class="flex justify-center gap-2">
					<button
						class="btn btn-circle btn-ghost btn-sm"
						title="Editar"
						onclick={() => {
							editingUsuario = usuario;
							showModal = true;
						}}
					>
						<Edit />
					</button>
					<button
						class="btn btn-circle btn-ghost text-error btn-sm"
						title="Eliminar"
						onclick={async () => {
							if (confirm('¿Eliminar este usuario?')) {
								try {
									await deleteUsuario(usuario.id);
									toast.success('Usuario eliminado');
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

		<Table data={await usuarios} {header} {row} />
	</div>
</PageLayout>

<Modal bind:open={showModal} title={editingUsuario ? 'Editar Usuario' : 'Nuevo Uusario'}>
	<form
		{...activeForm.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success(editingUsuario ? 'Usuario actualizado' : 'Usuario creado');
					form.element.reset();
					showModal = false;
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
		{#if editingUsuario}
			<input type="hidden" name="id" value={editingUsuario?.id} />
		{/if}
		<fieldset class="fieldset rounded-lg border p-4">
			<legend class="text-md fieldset-legend px-2 font-semibold">Datos</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper id="username" label="Nombre de usuario" required>
					<input
						class="input"
						autocomplete="username"
						{...activeForm.fields?.username?.as('text', editingUsuario?.username || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="password_hash" label="Contraseña">
					<input
						class="input"
						autocomplete="current-password"
						{...activeForm.fields?.password_hash?.as('password')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="rol" label="Rol" required>
					<select
						{...activeForm.fields?.rol_id?.as('select', String(editingUsuario?.rol?.id))}
						class="select"
					>
						<option value={null}>Seleccionar...</option>
						{#each roles as rol (rol.id)}
							<option value={String(rol.id)}>{rol.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper id="empleado_id" label="Empleado">
					<select
						{...activeForm.fields?.empleado_id?.as('select', String(editingUsuario?.empleado_id))}
						class="select"
					>
						<option value={null}>Sin asignar</option>
						{#if editingUsuario?.empleado}
							<option value={String(editingUsuario.empleado?.id)}
								>{editingUsuario?.empleado?.nombre} {editingUsuario.empleado?.apellido}</option
							>
						{/if}
						{#each empleados as emp (emp.id)}
							<option value={String(emp.id)}>{emp.nombre} {emp.apellido}</option>
						{/each}
					</select>
				</FormFieldWrapper>
			</div>
		</fieldset>
	</form>
	{#each activeForm.fields?.allIssues?.() as issue (issue)}
		<p class="mt-1 text-sm text-error">{issue.message}</p>
	{/each}
	{#snippet actions()}
		<button
			class="btn"
			onclick={() => {
				editingUsuario = null;
				showModal = false;
			}}>Cancelar</button
		>
		<button
			type="submit"
			class="btn btn-primary"
			form="cliente-form"
			disabled={!!activeForm.pending}
		>
			{activeForm.pending ? 'Guardando...' : editingUsuario ? 'Actualizar' : 'Guardar'}
		</button>
	{/snippet}
</Modal>
