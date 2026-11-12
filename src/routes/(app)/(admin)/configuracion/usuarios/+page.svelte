<script lang="ts">
	import { page } from '$app/state';
	import {
		FormErrors,
		FormFieldWrapper,
		Icono,
		MenuDesplegable,
		Modal,
		PageLayout,
		Persona,
		Table
	} from '$lib/ui';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { fechaRelativa } from '$lib/utils/fechas';
	import { getEmpleadosSinUsuario } from '$lib/modulos/configuracion/empleados.remote';
	import { getRoles } from '$lib/modulos/configuracion/roles.remote';
	import {
		actualizarUsuario,
		crearUsuario,
		deleteUsuario,
		getUsuarios,
		type UsuarioListado
	} from '$lib/modulos/configuracion/usuarios.remote';

	const usuarios = $derived(await getUsuarios());
	const roles = $derived(await getRoles());
	const libres = $derived(await getEmpleadosSinUsuario());

	let abierto = $state(false);
	let editando = $state<UsuarioListado | null>(null);
	const form = $derived(editando ? actualizarUsuario.for(String(editando.id)) : crearUsuario);
	const empleadosDisponibles = $derived(
		editando?.empleado?.id
			? [editando.empleado as { id: number; nombre: string; apellido: string }, ...libres]
			: libres
	);

	function abrir(usuario: UsuarioListado | null) {
		editando = usuario;
		abierto = true;
	}

	const eliminar = (usuario: UsuarioListado) =>
		confirmarYEjecutar({
			mensaje: `¿Eliminar el usuario ${usuario.username}? Ya no va a poder ingresar.`,
			ejecutar: () => deleteUsuario(usuario.id),
			exito: 'Usuario eliminado'
		});
</script>

{#snippet encabezado()}
	<th>Usuario</th>
	<th>Empleado</th>
	<th>Rol</th>
	<th class="hidden md:table-cell">Último acceso</th>
	<th class="w-0"></th>
{/snippet}
{#snippet fila(usuario: UsuarioListado)}
	<td>
		<button class="enlace-fila font-mono" onclick={() => abrir(usuario)}>{usuario.username}</button>
		{#if usuario.id === page.data.user?.id}<span class="badge badge-ghost badge-xs">Vos</span>{/if}
	</td>
	<td>
		<Persona
			nombre={usuario.empleado?.nombre}
			apellido={usuario.empleado?.apellido}
			vacio="Sin vincular"
		/>
	</td>
	<td>
		{#if usuario.rol?.nombre}
			<span class="badge badge-soft badge-sm badge-primary">{usuario.rol.nombre}</span>
		{:else}
			<span class="text-base-content/40">Sin rol</span>
		{/if}
	</td>
	<td class="hidden text-base-content/70 md:table-cell">
		{usuario.ultimo_acceso ? fechaRelativa(usuario.ultimo_acceso) : 'Nunca'}
	</td>
	<td>
		<MenuDesplegable alFinal class="btn btn-square btn-ghost btn-sm" titulo="Acciones">
			{#snippet etiqueta()}<Icono nombre="mas" />{/snippet}
			<li><button onclick={() => abrir(usuario)}>Editar</button></li>
			{#if usuario.id !== page.data.user?.id}
				<li><button class="text-error" onclick={() => eliminar(usuario)}>Eliminar</button></li>
			{/if}
		</MenuDesplegable>
	</td>
{/snippet}

<PageLayout>
	<header class="encabezado-fijo flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Usuarios</h1>
			<p class="text-sm text-base-content/60">
				Accesos al sistema. Vinculá cada usuario con su empleado para asignarle tareas y trabajos.
			</p>
		</div>
		<button class="btn btn-primary btn-sm" onclick={() => abrir(null)}>
			<Icono nombre="mas_simple" /> Nuevo usuario
		</button>
	</header>

	<div class="card overflow-hidden">
		<Table data={usuarios} header={encabezado} row={fila} emptyMessage="No hay usuarios" />
	</div>
</PageLayout>

<Modal
	bind:open={abierto}
	lateral
	titulo={editando ? `Editar ${editando.username}` : 'Nuevo usuario'}
	descripcion={editando ? 'Dejá la contraseña vacía para mantener la actual.' : undefined}
	alCerrar={() => (editando = null)}
	accion={{
		etiqueta: editando ? 'Guardar cambios' : 'Crear usuario',
		form: 'usuario-form',
		pendiente: !!form.pending
	}}
>
	{#key editando?.id}
		<form
			id="usuario-form"
			{...form.enhance(async (instancia) => {
				try {
					if (!(await instancia.submit())) return toast.error('Revisá los datos del usuario');
					toast.success(editando ? 'Usuario actualizado' : 'Usuario creado');
					instancia.element.reset();
					abierto = false;
				} catch (error) {
					toast.error(
						(error as { body?: { message?: string } }).body?.message ??
							'No se pudo guardar el usuario'
					);
				}
			})}
		>
			{#if editando}<input type="hidden" name="id" value={editando.id} />{/if}
			<FormFieldWrapper
				id="empleado_id"
				label="Empleado"
				ayuda="Su nombre aparece en el saludo y en las asignaciones."
			>
				<select
					id="empleado_id"
					class="select"
					{...form.fields.empleado_id.as(
						'select',
						editando?.empleado?.id ? String(editando.empleado.id) : ''
					)}
				>
					<option value="">Sin vincular</option>
					{#each empleadosDisponibles as empleado (empleado.id)}
						<option value={String(empleado.id)}>{empleado.nombre} {empleado.apellido}</option>
					{/each}
				</select>
			</FormFieldWrapper>
			<FormFieldWrapper id="username" label="Nombre de usuario" required>
				<input
					id="username"
					class="input"
					autocomplete="off"
					{...form.fields.username.as('text', editando?.username ?? '')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper id="password_hash" label="Contraseña" required={!editando}>
				<input
					id="password_hash"
					class="input"
					autocomplete="new-password"
					{...form.fields.password_hash.as('password')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper id="rol_id" label="Rol" required>
				<select
					id="rol_id"
					class="select"
					{...form.fields.rol_id.as('select', editando?.rol?.id ? String(editando.rol.id) : '')}
				>
					<option value="">Seleccionar...</option>
					{#each roles as rol (rol.id)}
						<option value={String(rol.id)}>{rol.nombre}</option>
					{/each}
				</select>
			</FormFieldWrapper>
			<FormErrors {form} />
		</form>
	{/key}
</Modal>
