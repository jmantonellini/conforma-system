<script lang="ts">
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
	import FormDireccion from '$lib/ui/FormDireccion.svelte';
	import {
		getEmpleados,
		crearEmpleado,
		actualizarEmpleado,
		eliminarEmpleado
	} from '$lib/modulos/configuracion/empleados.remote';
	import {
		getUsuariosSinEmpleado,
		vincularUsuarioEmpleado
	} from '$lib/modulos/configuracion/usuarios.remote';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	type Empleado = Awaited<ReturnType<typeof getEmpleados>>[number];

	let empleados = getEmpleados();
	let abierto = $state(false);
	let editando = $state<Empleado | null>(null);
	let activeForm = $derived(editando ? actualizarEmpleado : crearEmpleado);

	function abrir(empleado: Empleado | null) {
		editando = empleado;
		abierto = true;
	}

	const usuariosLibres = $derived(await getUsuariosSinEmpleado());

	async function vincular(empleado: Empleado, valor: string) {
		try {
			await vincularUsuarioEmpleado({
				empleado_id: empleado.id,
				usuario_id: valor ? Number(valor) : null
			});
			toast.success(valor ? 'Usuario vinculado' : 'Usuario desvinculado');
		} catch {
			toast.error('No se pudo vincular el usuario');
		}
	}

	function cerrarModal() {
		abierto = false;
		editando = null;
	}
</script>

{#snippet header()}
	<th>Empleado</th>
	<th class="hidden md:table-cell">Contacto</th>
	<th>Acceso al sistema</th>
	<th class="w-0"></th>
{/snippet}

{#snippet row(empleado: Empleado)}
	<td>
		<button class="enlace-fila" onclick={() => abrir(empleado)}>
			<Persona nombre={empleado.nombre} apellido={empleado.apellido} />
		</button>
	</td>
	<td class="hidden text-base-content/70 md:table-cell">
		{[empleado.telefono, empleado.email].filter(Boolean).join(' · ') || '-'}
	</td>
	<td>
		<select
			class="select w-44 select-sm"
			aria-label="Usuario de {empleado.nombre}"
			value={empleado.usuario?.id ? String(empleado.usuario.id) : ''}
			onchange={(e) => vincular(empleado, e.currentTarget.value)}
		>
			<option value="">Sin usuario</option>
			{#if empleado.usuario?.id}
				<option value={String(empleado.usuario.id)}>{empleado.usuario.username}</option>
			{/if}
			{#each usuariosLibres as usuario (usuario.id)}
				<option value={String(usuario.id)}>{usuario.username}</option>
			{/each}
		</select>
	</td>
	<td>
		<MenuDesplegable alFinal class="btn btn-square btn-ghost btn-sm" titulo="Acciones">
			{#snippet etiqueta()}<Icono nombre="mas" />{/snippet}
			<li><button onclick={() => abrir(empleado)}>Editar</button></li>
			<li>
				<button
					class="text-error"
					onclick={() =>
						confirmarYEjecutar({
							mensaje: `¿Eliminar a ${empleado.nombre} ${empleado.apellido}?`,
							ejecutar: () => eliminarEmpleado(String(empleado.id)),
							exito: 'Empleado eliminado'
						})}>Eliminar</button
				>
			</li>
		</MenuDesplegable>
	</td>
{/snippet}

<PageLayout>
	<header class="encabezado-fijo flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Empleados</h1>
			<p class="text-sm text-base-content/60">
				El equipo de la empresa. Vinculá un usuario para que pueda ingresar al sistema.
			</p>
		</div>
		<button class="btn btn-primary btn-sm" onclick={() => abrir(null)}>
			<Icono nombre="mas_simple" /> Nuevo empleado
		</button>
	</header>

	<div class="card overflow-hidden">
		<Table data={await empleados} {header} {row} emptyMessage="No hay empleados" />
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
