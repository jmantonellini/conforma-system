<script lang="ts">
	import {
		getRoles,
		getPermisos,
		getPermisosByRol,
		asignarPermisos
	} from '$lib/remote/roles.remote';
	import { PageLayout, PageHeader } from '$lib/components/ui';
	import Can from '$lib/components/ui/Can.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let roles = await getRoles();
	let todosPermisos = await getPermisos();
	let rolSeleccionado = $state(roles[0]);

	// svelte-ignore non_reactive_update
	let permisosDelRol = new SvelteSet<number>();

	async function cargarPermisos() {
		const result = await getPermisosByRol(rolSeleccionado.id);
		permisosDelRol = new SvelteSet(result.map((p) => p.id ?? 0));
	}

	await cargarPermisos();

	async function togglePermiso(permisoId: number) {
		if (permisosDelRol.has(permisoId)) {
			permisosDelRol.delete(permisoId);
		} else {
			permisosDelRol.add(permisoId);
		}
		permisosDelRol = new SvelteSet(permisosDelRol); // Forzar actualización
	}

	async function guardar() {
		await asignarPermisos({
			rol_id: rolSeleccionado.id.toString(),
			permisos: Array.from(permisosDelRol)
		});
		alert('Permisos guardados');
	}
</script>

<Can modulo="configuracion">
	<PageLayout>
		<PageHeader title="Roles y Permisos" description="Selecciona un rol y asigna sus permisos" />

		<div class="flex gap-6">
			<!-- Lista de roles -->
			<div class="w-64 space-y-2">
				{#each roles as rol (rol.id)}
					<button
						class="btn w-full justify-start {rolSeleccionado.id === rol.id
							? 'btn-primary'
							: 'btn-ghost'}"
						onclick={() => {
							rolSeleccionado = rol;
							cargarPermisos();
						}}
					>
						{rol.nombre}
					</button>
				{/each}
			</div>

			<!-- Permisos agrupados por módulo -->
			<div class="flex-1 space-y-4">
				<h2 class="text-xl font-bold">{rolSeleccionado.nombre}</h2>

				{#each Object.entries(Object.groupBy(todosPermisos, (p) => p.modulo)) as [modulo, permisos] (modulo)}
					<div class="card bg-base-100 shadow">
						<div class="card-body">
							<h3 class="card-title capitalize">{modulo}</h3>
							<div class="flex flex-wrap gap-4">
								{#each permisos as p (p.id)}
									<label class="label cursor-pointer gap-2">
										<span class="label-text capitalize">{p.accion}</span>
										<input
											type="checkbox"
											class="checkbox checkbox-primary"
											checked={permisosDelRol.has(p.id)}
											onchange={() => togglePermiso(p.id)}
										/>
									</label>
								{/each}
							</div>
						</div>
					</div>
				{/each}

				<div class="flex justify-end">
					<button class="btn btn-primary" onclick={guardar}>Guardar cambios</button>
				</div>
			</div>
		</div>
	</PageLayout>
</Can>
