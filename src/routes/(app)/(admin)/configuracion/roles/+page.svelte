<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import { Can, FormFieldWrapper, Icono, MenuDesplegable, Modal, PageLayout } from '$lib/ui';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { can } from '$lib/utils/permissions';
	import { mensajeError } from '$lib/utils/errores';
	import { ACCIONES, CATALOGO_PERMISOS, type Accion } from '$lib/modulos/configuracion/permisos';
	import {
		actualizarRol,
		crearRol,
		eliminarRol,
		getPermisosByRol,
		getRoles,
		guardarPermisosRol,
		type RolListado
	} from '$lib/modulos/configuracion/roles.remote';

	const puedeEditar = can(page.data.user, page.data.permisos, 'configuracion', 'edit');
	const roles = $derived(await getRoles());
	let rolId = $state(Number(page.url.searchParams.get('rol')) || null);
	const rol = $derived(roles.find((r) => r.id === rolId) ?? roles[0]);

	const seleccionar = (id: number) => (rolId = id);
	const asignados = $derived(rol ? await getPermisosByRol(rol.id) : []);

	const clave = (modulo: string, accion: string) => `${modulo}.${accion}`;
	const original = $derived(new Set(asignados.map((p) => clave(p.modulo, p.accion))));
	let borrador = $derived(new SvelteSet(original));
	const sinGuardar = $derived(
		borrador.size !== original.size || [...borrador].some((c) => !original.has(c))
	);
	const editable = $derived(puedeEditar && !!rol && !rol.esAdministrador);
	let guardando = $state(false);

	function alternar(modulo: string, accion: Accion) {
		const c = clave(modulo, accion);
		if (borrador.has(c)) {
			borrador.delete(c);
			if (accion === 'view') {
				for (const otra of ACCIONES) borrador.delete(clave(modulo, otra.valor));
			}
		} else {
			borrador.add(c);
			borrador.add(clave(modulo, 'view'));
		}
	}

	function alternarFila(modulo: string, acciones: readonly Accion[]) {
		const completa = acciones.every((a) => borrador.has(clave(modulo, a)));
		for (const accion of acciones) {
			if (completa) borrador.delete(clave(modulo, accion));
			else borrador.add(clave(modulo, accion));
		}
	}

	const tiene = (modulo: string, accion: Accion) =>
		rol?.esAdministrador || borrador.has(clave(modulo, accion));

	async function guardar() {
		if (!rol) return;
		guardando = true;
		try {
			await guardarPermisosRol({
				rol_id: rol.id,
				permisos: [...borrador].map((c) => {
					const [modulo, accion] = c.split('.');
					return { modulo, accion };
				})
			});
			toast.success(`Permisos de «${rol.nombre}» guardados`);
			if (page.data.user?.rol?.id === rol.id) await invalidateAll();
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudieron guardar los permisos'));
		} finally {
			guardando = false;
		}
	}

	let edicion = $state<{ id: number | null; nombre: string; descripcion: string } | null>(null);
	let guardandoRol = $state(false);

	async function guardarRol(evento: SubmitEvent) {
		evento.preventDefault();
		if (!edicion) return;
		guardandoRol = true;
		try {
			const datos = { nombre: edicion.nombre, descripcion: edicion.descripcion };
			if (edicion.id) {
				await actualizarRol({ id: edicion.id, ...datos });
				toast.success('Rol actualizado');
			} else {
				const nuevo = await crearRol(datos);
				toast.success('Rol creado. Elegí sus permisos.');
				seleccionar(nuevo.id);
			}
			edicion = null;
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo guardar el rol'));
		} finally {
			guardandoRol = false;
		}
	}

	const eliminar = (objetivo: RolListado) =>
		confirmarYEjecutar({
			mensaje: `¿Eliminar el rol «${objetivo.nombre}»?`,
			ejecutar: async () => {
				await eliminarRol(objetivo.id);
				rolId = null;
			},
			exito: 'Rol eliminado'
		});
</script>

<PageLayout>
	<header class="encabezado-fijo flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Roles y permisos</h1>
			<p class="text-sm text-base-content/60">
				Cada usuario tiene un rol; el rol define qué puede ver y hacer en cada módulo.
			</p>
		</div>
		<Can modulo="configuracion" accion="edit">
			<button
				class="btn btn-primary btn-sm"
				onclick={() => (edicion = { id: null, nombre: '', descripcion: '' })}
			>
				<Icono nombre="mas_simple" /> Nuevo rol
			</button>
		</Can>
	</header>

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-[16rem_1fr]">
		<nav class="card overflow-hidden" aria-label="Roles">
			<ul class="menu w-full gap-0.5 p-2">
				{#each roles as item (item.id)}
					<li>
						<button
							class={['flex flex-col items-start gap-0', item.id === rol?.id && 'menu-active']}
							onclick={() => seleccionar(item.id)}
						>
							<span class="font-medium">{item.nombre}</span>
							<span class="text-xs opacity-70">
								{item.usuarios}
								{item.usuarios === 1 ? 'usuario' : 'usuarios'}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</nav>

		{#if rol}
			<svelte:boundary>
				<section class="card overflow-hidden">
					<header
						class="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 p-4 sm:p-5"
					>
						<div>
							<h2 class="flex items-center gap-2 text-lg font-semibold">
								{rol.nombre}
								{#if $effect.pending()}
									<span class="loading loading-xs loading-spinner text-base-content/50"></span>
								{/if}
							</h2>
							<p class="text-sm text-base-content/60">{rol.descripcion || 'Sin descripción'}</p>
						</div>
						{#if editable}
							<MenuDesplegable
								alFinal
								class="btn btn-square btn-ghost btn-sm"
								titulo="Acciones del rol"
							>
								{#snippet etiqueta()}<Icono nombre="mas" />{/snippet}
								<li>
									<button
										onclick={() =>
											(edicion = {
												id: rol.id,
												nombre: rol.nombre,
												descripcion: rol.descripcion ?? ''
											})}>Renombrar</button
									>
								</li>
								<li>
									<button
										class="text-error"
										disabled={rol.usuarios > 0}
										onclick={() => eliminar(rol)}
									>
										Eliminar{rol.usuarios ? ' (tiene usuarios)' : ''}
									</button>
								</li>
							</MenuDesplegable>
						{/if}
					</header>

					{#if rol.esAdministrador}
						<div class="m-4 alert alert-soft text-sm alert-info sm:mx-5">
							<Icono nombre="check" /> El rol admin tiene acceso total y no se puede restringir.
						</div>
					{/if}

					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Módulo</th>
									{#each ACCIONES as accion (accion.valor)}
										<th class="w-14 px-1 text-center">{accion.etiqueta}</th>
									{/each}
									<th class="w-14 px-1 text-center">Todo</th>
								</tr>
							</thead>
							<tbody>
								{#each CATALOGO_PERMISOS as entrada (entrada.modulo)}
									<tr>
										<td class="min-w-48">
											<p class="font-medium">{entrada.etiqueta}</p>
											<p class="secundario">{entrada.descripcion}</p>
										</td>
										{#each ACCIONES as accion (accion.valor)}
											<td class="px-1 text-center">
												{#if entrada.acciones.includes(accion.valor)}
													<input
														type="checkbox"
														class="checkbox checkbox-sm checkbox-primary"
														aria-label="{accion.etiqueta} {entrada.etiqueta}"
														checked={tiene(entrada.modulo, accion.valor)}
														disabled={!editable}
														onchange={() => alternar(entrada.modulo, accion.valor)}
													/>
												{:else}
													<span class="text-base-content/25" aria-hidden="true">—</span>
												{/if}
											</td>
										{/each}
										<td class="text-center">
											{#if entrada.acciones.length > 1}
												<input
													type="checkbox"
													class="toggle toggle-xs"
													aria-label="Todo {entrada.etiqueta}"
													checked={entrada.acciones.every((a) => tiene(entrada.modulo, a))}
													disabled={!editable}
													onchange={() => alternarFila(entrada.modulo, entrada.acciones)}
												/>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if editable}
						<footer
							class={[
								'sticky bottom-0 flex items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-4 py-3 sm:px-5',
								sinGuardar && 'bg-warning/10'
							]}
						>
							<span class="text-sm text-base-content/70">
								{sinGuardar
									? 'Tenés cambios sin guardar'
									: 'Ver es necesario para cualquier otra acción del módulo.'}
							</span>
							<div class="flex gap-2">
								<button
									class="btn btn-ghost btn-sm"
									disabled={!sinGuardar || guardando}
									onclick={() => (borrador = new SvelteSet(original))}>Descartar</button
								>
								<button
									class="btn btn-primary btn-sm"
									disabled={!sinGuardar || guardando}
									onclick={guardar}
								>
									{#if guardando}<span class="loading loading-xs loading-spinner"></span>{/if}
									Guardar cambios
								</button>
							</div>
						</footer>
					{/if}
				</section>
				{#snippet failed(_, reintentar)}
					<div class="alert alert-soft alert-error">
						<span>No se pudieron cargar los permisos de este rol. Revisá la conexión.</span>
						<button class="btn btn-sm" onclick={reintentar}>Reintentar</button>
					</div>
				{/snippet}
			</svelte:boundary>
		{/if}
	</div>
</PageLayout>

<Modal
	open={!!edicion}
	ancho="sm"
	titulo={edicion?.id ? 'Renombrar rol' : 'Nuevo rol'}
	alCerrar={() => (edicion = null)}
	accion={{
		etiqueta: edicion?.id ? 'Guardar' : 'Crear rol',
		form: 'rol-form',
		pendiente: guardandoRol
	}}
>
	{#if edicion}
		<form id="rol-form" onsubmit={guardarRol}>
			<FormFieldWrapper id="rol-nombre" label="Nombre" required>
				<input id="rol-nombre" class="input" required maxlength="60" bind:value={edicion.nombre} />
			</FormFieldWrapper>
			<FormFieldWrapper id="rol-descripcion" label="Descripción">
				<input id="rol-descripcion" class="input" bind:value={edicion.descripcion} />
			</FormFieldWrapper>
		</form>
	{/if}
</Modal>
