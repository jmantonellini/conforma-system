<script lang="ts">
	import { confirmarYEjecutar } from '$lib/stores/confirmacion.svelte';
	import { FormErrors, FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
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

	type Usuario = {
		id: number;
		username: string;
		empleado_id: number | null;
		rol: { id: number | null; nombre: string | null } | null;
		empleado: { id: number | null; nombre: string | null; apellido: string | null } | null;
	};

	let usuarios = getUsuarios();
	let roles = await getRoles();
	let empleados = await getEmpleadosSinUsuario();
	let showModal = $state(false);
	let editingUsuario = $state<Usuario | null>(null);
	let activeForm = $derived(editingUsuario ? actualizarUsuario : crearUsuario);
</script>

<PageLayout>
	<div class="flex justify-end">
		<button
			class="btn btn-primary btn-sm"
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

		{#snippet row(usuario: Awaited<typeof usuarios>[number])}
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
						onclick={() =>
							confirmarYEjecutar({
								mensaje: '¿Eliminar este usuario?',
								ejecutar: () => deleteUsuario(usuario.id),
								exito: 'Usuario eliminado'
							})}
					>
						<Delete />
					</button>
				</div>
			</td>
		{/snippet}

		<Table data={await usuarios} {header} {row} />
	</div>
</PageLayout>

<Modal
	bind:open={showModal}
	titulo={editingUsuario ? 'Editar usuario' : 'Nuevo usuario'}
	descripcion={editingUsuario ? 'Dejá la contraseña vacía para mantener la actual.' : undefined}
	alCerrar={() => (editingUsuario = null)}
	accion={{
		etiqueta: editingUsuario ? 'Guardar cambios' : 'Crear usuario',
		form: 'usuario-form',
		pendiente: !!activeForm.pending
	}}
>
	<form
		{...activeForm.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success(editingUsuario ? 'Usuario actualizado' : 'Usuario creado');
					form.element.reset();
					showModal = false;
				} else {
					toast.error('Revisá los datos del usuario');
				}
			} catch {
				toast.error('No se pudo guardar el usuario');
			}
		})}
		id="usuario-form"
	>
		{#if editingUsuario}
			<input type="hidden" name="id" value={editingUsuario?.id} />
		{/if}
		<div class="grid gap-4 sm:grid-cols-2">
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
					<option value="">Seleccionar...</option>
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
					<option value="">Sin asignar</option>
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
		<FormErrors form={activeForm} />
	</form>
</Modal>
