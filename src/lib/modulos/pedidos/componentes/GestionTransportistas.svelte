<script lang="ts">
	import { Modal } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { RETIRA_EN_FABRICA } from '$lib/modulos/ventas/trabajo';
	import {
		agregarTransportista,
		cambiarActivoTransportista,
		getTransportistasGestion,
		renombrarTransportista
	} from '../transportistas.remote';

	let open = $state(false);
	let nuevo = $state('');
	let editando = $state<number | null>(null);
	let nombreEditado = $state('');
	let ocupado = $state(false);

	const transportistas = $derived(open ? await getTransportistasGestion() : []);

	export function abrir() {
		open = true;
	}

	async function ejecutar(accion: () => Promise<unknown>, exito: string) {
		ocupado = true;
		try {
			await accion();
			toast.success(exito);
			return true;
		} catch (causa) {
			toast.error(mensajeError(causa, 'No se pudo guardar el transportista'));
			return false;
		} finally {
			ocupado = false;
		}
	}

	async function agregar(evento: SubmitEvent) {
		evento.preventDefault();
		const nombre = nuevo.trim();
		if (!nombre) return;
		if (await ejecutar(() => agregarTransportista(nombre), `${nombre} agregado`)) nuevo = '';
	}

	function empezarEdicion(id: number, nombre: string) {
		editando = id;
		nombreEditado = nombre;
	}

	async function renombrar(evento: SubmitEvent, id: number) {
		evento.preventDefault();
		const nombre = nombreEditado.trim();
		if (!nombre) return;
		const ok = await ejecutar(
			() => renombrarTransportista({ id, nombre }),
			'Nombre actualizado en contactos y pedidos'
		);
		if (ok) editando = null;
	}
</script>

<Modal
	bind:open
	lateral
	titulo="Transportistas"
	descripcion="Los que aparecen al elegir el transportista en contactos, pedidos y envíos."
>
	<div class="flex flex-col gap-4">
		<form class="join w-full" onsubmit={agregar}>
			<input
				class="input join-item w-full"
				placeholder="Nuevo transportista"
				aria-label="Nombre del nuevo transportista"
				bind:value={nuevo}
			/>
			<button class="btn join-item btn-primary" disabled={!nuevo.trim() || ocupado}>Agregar</button>
		</form>

		{#if transportistas.length}
			<ul class="list rounded-box border border-base-300">
				{#each transportistas as transportista (transportista.id)}
					<li class="list-row items-center">
						{#if editando === transportista.id}
							<form
								class="list-col-grow join w-full"
								onsubmit={(evento) => renombrar(evento, transportista.id)}
							>
								<input
									class="input join-item w-full input-sm"
									aria-label="Nuevo nombre de {transportista.nombre}"
									bind:value={nombreEditado}
									{@attach (input) => input.select()}
									onkeydown={(evento) => {
										if (evento.key === 'Escape') {
											evento.stopPropagation();
											editando = null;
										}
									}}
								/>
								<button class="btn join-item btn-primary btn-sm" disabled={ocupado}>Guardar</button>
								<button
									type="button"
									class="btn join-item btn-ghost btn-sm"
									onclick={() => (editando = null)}>Cancelar</button
								>
							</form>
						{:else}
							<div class="list-col-grow min-w-0">
								<p
									class={[
										'truncate font-medium',
										!transportista.activo && 'text-base-content/50 line-through'
									]}
								>
									{transportista.nombre}
								</p>
								<p class="secundario">
									{transportista.envios === 1 ? '1 envío' : `${transportista.envios} envíos`}
									{#if !transportista.activo}· No aparece al elegir{/if}
								</p>
							</div>
							<button
								class="btn btn-ghost btn-xs"
								disabled={ocupado}
								onclick={() => empezarEdicion(transportista.id, transportista.nombre)}
							>
								Renombrar
							</button>
							<input
								type="checkbox"
								class="toggle toggle-sm toggle-success"
								aria-label="{transportista.nombre} activo"
								title={transportista.activo ? 'Activo' : 'Inactivo'}
								checked={transportista.activo ?? false}
								disabled={ocupado}
								onchange={(evento) => {
									const activo = evento.currentTarget.checked;
									void ejecutar(
										() => cambiarActivoTransportista({ id: transportista.id, activo }),
										activo
											? `${transportista.nombre} activado`
											: `${transportista.nombre} desactivado`
									);
								}}
							/>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-base-content/60">Todavía no hay transportistas cargados.</p>
		{/if}

		<p class="text-sm text-base-content/60">
			"{RETIRA_EN_FABRICA}" siempre está disponible como opción. Desactivar un transportista no
			cambia los envíos ni los contactos que ya lo usan.
		</p>
	</div>
</Modal>
