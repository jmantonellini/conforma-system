<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import Logo from '$lib/assets/Logo.png';
	import { enviarFeedback, logout } from '$lib/modulos/auth/auth.remote';
	import type { UsuarioSesion } from '$lib/server/auth/permissions';
	import { can } from '$lib/utils/permissions';
	import CampanaNotificaciones from '$lib/modulos/notificaciones/componentes/CampanaNotificaciones.svelte';
	import FormFieldWrapper from './FormFieldWrapper.svelte';
	import Icono from './Icono.svelte';
	import MenuDesplegable from './MenuDesplegable.svelte';
	import Modal from './Modal.svelte';
	import { toast } from './toast.svelte';

	type Permiso = Parameters<typeof can>[1][number];

	let {
		usuario,
		permisos,
		empresa
	}: {
		usuario: UsuarioSesion;
		permisos: Permiso[];
		empresa: { razon_social: string } | null;
	} = $props();

	const form = enviarFeedback;
	let sugerencias = $state(false);

	const nombre = $derived(
		[usuario.empleado?.nombre, usuario.empleado?.apellido].filter(Boolean).join(' ') ||
			usuario.username
	);
	const iniciales = $derived(
		nombre
			.split(/\s+/)
			.slice(0, 2)
			.map((parte) => parte[0])
			.join('')
			.toUpperCase()
	);

	const ACCESOS = [
		{ modulo: 'cotizaciones', etiqueta: 'Cotización', href: '/cotizaciones/crear' },
		{ modulo: 'pedidos', etiqueta: 'Pedido', href: '/pedidos/crear' },
		{ modulo: 'contactos', etiqueta: 'Contacto', href: '/contactos/crear' },
		{ modulo: 'productos', etiqueta: 'Producto', href: '/productos/crear' }
	] as const;
	const accesos = $derived(ACCESOS.filter((a) => can(usuario, permisos, a.modulo, 'create')));
	const veConfiguracion = $derived(can(usuario, permisos, 'configuracion', 'view'));

	async function salir() {
		await logout();
		await goto(resolve('/login'));
	}
</script>

<header
	class="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-base-300 bg-base-100/95 px-4 backdrop-blur sm:px-6"
>
	<a href={resolve('/')} class="flex shrink-0 items-center" aria-label="Inicio">
		<img src={Logo} alt="Conforma" class="h-7 w-auto" />
	</a>
	{#if empresa}
		<span class="hidden h-6 border-l border-base-300 sm:block"></span>
		<span class="hidden truncate text-sm font-medium text-base-content/70 sm:block">
			{empresa.razon_social}
		</span>
	{/if}

	<div class="ml-auto flex items-center gap-1">
		{#if accesos.length}
			<MenuDesplegable alFinal class="btn btn-primary btn-sm" titulo="Crear">
				{#snippet etiqueta()}
					<Icono nombre="mas_simple" />
					<span class="hidden sm:inline">Nuevo</span>
				{/snippet}
				<li class="menu-title">Crear</li>
				{#each accesos as acceso (acceso.href)}
					<li><a href={resolve(acceso.href as Pathname as '/')}>{acceso.etiqueta}</a></li>
				{/each}
				<li><a href={resolve('/tareas')}>Tarea</a></li>
			</MenuDesplegable>
			<span class="mx-1 hidden h-6 border-l border-base-300 sm:block"></span>
		{/if}

		<button
			class="tooltip btn tooltip-bottom hidden btn-square btn-ghost btn-sm sm:inline-flex"
			data-tip="Sugerencias y errores"
			aria-label="Sugerencias y errores"
			onclick={() => (sugerencias = true)}
		>
			<Icono nombre="mensaje" class="size-5" />
		</button>
		<CampanaNotificaciones />

		<MenuDesplegable alFinal class="btn gap-2 btn-ghost px-1.5 btn-sm" titulo="Mi cuenta">
			{#snippet etiqueta()}
				<span
					class="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-content"
					aria-hidden="true">{iniciales}</span
				>
				<span class="hidden max-w-40 truncate text-sm font-medium md:block">{nombre}</span>
				<Icono nombre="abajo" class="hidden size-3.5 opacity-60 md:block" />
			{/snippet}
			<li class="pointer-events-none px-3 py-2">
				<span class="block p-0 text-sm font-semibold text-base-content">{nombre}</span>
				<span class="block p-0 text-xs text-base-content/60">
					@{usuario.username}{usuario.rol?.nombre ? ` · ${usuario.rol.nombre}` : ''}
				</span>
			</li>
			<li class="my-1 border-t border-base-300"></li>
			{#if veConfiguracion}
				<li>
					<a href={resolve('/configuracion/empresa')}><Icono nombre="ajustes" /> Configuración</a>
				</li>
			{/if}
			<li>
				<button onclick={() => (sugerencias = true)}>
					<Icono nombre="mensaje" /> Enviar sugerencia
				</button>
			</li>
			<li>
				<button class="text-error" onclick={salir}><Icono nombre="salir" /> Cerrar sesión</button>
			</li>
		</MenuDesplegable>
	</div>
</header>

<Modal
	bind:open={sugerencias}
	titulo="Sugerencias y errores"
	descripcion="Contanos qué mejorarías o qué falló. El mensaje es anónimo."
	accion={{ etiqueta: 'Enviar', form: 'feedback-form', pendiente: !!form.pending }}
>
	<form
		id="feedback-form"
		{...form.enhance(async (instancia) => {
			try {
				if (!(await instancia.submit())) return toast.error('No se pudo enviar el mensaje');
				sugerencias = false;
				instancia.element.reset();
				toast.success('¡Gracias! Recibimos tu mensaje');
			} catch {
				toast.error('No se pudo enviar el mensaje');
			}
		})}
	>
		<FormFieldWrapper id="mensaje" label="Mensaje" required>
			<textarea id="mensaje" class="textarea" rows="5" {...form.fields.mensaje.as('text')}
			></textarea>
		</FormFieldWrapper>
	</form>
</Modal>
