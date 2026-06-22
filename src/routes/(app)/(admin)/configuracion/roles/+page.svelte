<script lang="ts">
	import {
		getPermisosByRol,
		asignarPermisos
	} from '$lib/remote/roles.remote';
	import { PageLayout, PageHeader } from '$lib/components/ui';
	import Can from '$lib/components/ui/Can.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';

	let roles = page.data.todosRoles;
	let todosPermisos = page.data.todosPermisos;

	let rolSeleccionado = $state(roles[0]);

	const result = $derived(await getPermisosByRol(rolSeleccionado.id));
	const ids = $derived(result.map((p) => p.id).filter((id): id is number => id != null));
	let permisosActivos = $derived(new SvelteSet(ids));

	// 👇 Toggle de permiso
	function togglePermiso(permisoId: number) {
		if (permisosActivos.has(permisoId)) {
			permisosActivos.delete(permisoId);
		} else {
			permisosActivos.add(permisoId);
		}
		// 👇 Forzar actualización del Set
		permisosActivos = new SvelteSet(permisosActivos);
	}

	// 👇 Guardar cambios
	async function guardar() {
		try {
			await asignarPermisos({
				rol_id: String(rolSeleccionado.id),
				permisos: Array.from(permisosActivos)
			});
			toast.success('Permisos guardados');
		} catch (error) {
			console.log(error);

			toast.error('Error al guardar permisos');
		}
	}

	// 👇 Agrupar permisos por módulo
	function agruparPorModulo(permisos: any[]) {
		const grouped: Record<string, any[]> = {};
		for (const p of permisos) {
			if (!grouped[p.modulo]) grouped[p.modulo] = [];
			grouped[p.modulo].push(p);
		}
		return grouped;
	}

	const permisosPorModulo = agruparPorModulo(todosPermisos);
</script>

<Can modulo="configuracion">
	<PageLayout>
		<PageHeader title="Roles y Permisos" description="Selecciona un rol y asigna sus permisos" />

		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- Lista de roles -->
			<div class="w-full lg:w-64">
				<div class="card bg-base-100 shadow">
					<div class="card-body">
						<h3 class="card-title text-sm">Roles</h3>
						<div class="space-y-2">
							{#each roles as rol (rol.id)}
								<button
									class="btn w-full justify-start {rolSeleccionado.id === rol.id
										? 'btn-primary'
										: 'btn-ghost'}"
									onclick={() => {
										rolSeleccionado = rol;
									}}
								>
									{rol.nombre}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Permisos -->
			<div class="flex-1">
				<div class="card bg-base-100 shadow">
					<div class="card-body">
						<div class="flex items-center justify-between">
							<h2 class="text-xl font-bold">{rolSeleccionado.nombre}</h2>
							<button class="btn btn-sm btn-primary" onclick={guardar}> Guardar cambios </button>
						</div>

						<div class="divider"></div>

						{#each Object.entries(permisosPorModulo) as [modulo, lista] (modulo + lista[0].id)}
							<div class="mb-4">
								<h3 class="text-md font-semibold capitalize">{modulo}</h3>
								<div class="mt-2 flex flex-wrap gap-4">
									{#each lista as p (p.id)}
										<label class="label cursor-pointer gap-2">
											<span class="label-text capitalize">{p.accion}</span>
											<input
												type="checkbox"
												class="checkbox checkbox-sm checkbox-primary"
												checked={permisosActivos.has(p.id)}
												onchange={() => togglePermiso(p.id)}
											/>
										</label>
									{/each}
								</div>
								<div class="divider"></div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</PageLayout>
</Can>
