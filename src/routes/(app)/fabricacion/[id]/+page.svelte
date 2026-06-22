<script lang="ts">
	import {
		getOrdenFabricacion,
		ejecutarAccionFabricacion,
		eliminarOrdenFabricacion
	} from '$lib/remote/fabricacion.remote';
	import { PageLayout, PageHeader, Modal } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { AccionFabricacion } from '$lib/server/db/schema';

	let { params } = $props();
	const orden = $derived(await getOrdenFabricacion(Number(params.id)));

	let isLoading = $state(false);

	let modal = $state({
		open: false,
		tipo: 'pausa' as 'pausa' | 'eliminar',
		titulo: '',
		mensaje: '',
		onConfirm: () => {}
	});

	let comentario = $state('');

	async function ejecutarAccionDirecta(
		unidadId: number,
		accion: AccionFabricacion,
		comentario?: string
	) {
		if (isLoading) return;
		isLoading = true;
		try {
			await ejecutarAccionFabricacion({
				unidad_id: String(unidadId),
				accion_id: String(accion.id),
				comentario: comentario
			});
			toast.success(`"${accion.nombre}" ejecutada`);
			goto(resolve(`/fabricacion/${orden.id}`));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Error');
		} finally {
			isLoading = false;
		}
	}

	function manejarAccion(unidadId: number, accion: AccionFabricacion) {
		if (accion.nombre === 'Pausar') {
			// Abrir modal para pausa
			modal = {
				open: true,
				tipo: 'pausa',
				titulo: 'Motivo de la pausa',
				mensaje: 'Describe el motivo de la pausa...',
				onConfirm: async () => {
					await ejecutarAccionDirecta(unidadId, accion, comentario.trim());
					modal.open = false;
					comentario = '';
				}
			};
			return;
		}

		ejecutarAccionDirecta(unidadId, accion);
	}

	function manejarEliminar(id: string) {
		modal = {
			open: true,
			tipo: 'eliminar',
			titulo: 'Eliminar Orden de Fabricación',
			mensaje: '¿Seguro que quieres eliminar esta orden?',
			onConfirm: async () => {
				await eliminarOrdenFabricacion(id);
				modal.open = false;
				toast.success('Orden eliminada');
				goto(resolve('/fabricacion'));
			}
		};
	}

	function cerrarModal() {
		modal.open = false;
		comentario = '';
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-4">
		<PageHeader title={`Orden de Fabricación #${orden.id}`} description={orden.nombre_trabajo} />
		<p class="text-sm text-base-content/70">
			Pedido: {orden.pedido_numero} · Producto: {orden.producto_nombre || 'Personalizado'}
		</p>
		<div class="flex items-center justify-between">
			<a href={resolve('/fabricacion')} class="btn btn-ghost btn-sm">← Volver</a>
			<button
				class="btn btn-outline btn-sm btn-error"
				onclick={() => manejarEliminar(String(orden.id))}>Eliminar</button
			>
		</div>

		<!-- Cards de resumen -->
		<div class="stats w-full stats-vertical shadow lg:stats-horizontal">
			<div class="stat bg-base-200">
				<div class="stat-title">Progreso</div>
				<div class="stat-value text-lg">{orden.cantidad_producida}/{orden.cantidad_total}</div>
				<progress
					class="progress w-full"
					value={orden.cantidad_producida}
					max={orden.cantidad_total}
				>
				</progress>
			</div>
			<div class="stat bg-base-200">
				<div class="stat-title">Cliente</div>
				<div class="stat-value text-lg">{orden.cliente.nombre}</div>
			</div>
			<div class="stat bg-base-200">
				<div class="stat-title">Estado</div>
				<div class="stat-value">
					<span class={`badge badge-${orden.estado?.color}`}>
						{orden.estado?.nombre}
					</span>
				</div>
				{#if orden.estado_comentario}
					<div class="stat-desc text-error">
						<span>{orden.estado_comentario}</span>
					</div>
				{/if}
			</div>
			<div class="stat bg-base-200">
				<div class="stat-title">Prioridad</div>
				<div class="stat-value">
					{#if orden.prioridad === 2}
						<span class="badge badge-error">Crítica</span>
					{:else if orden.prioridad === 1}
						<span class="badge badge-warning">Urgente</span>
					{:else}
						<span class="badge badge-ghost">Normal</span>
					{/if}
				</div>
			</div>
			<div class="stat bg-base-200">
				<div class="stat-title">Asignado a</div>
				<div class="stat-value text-lg">{orden.empleado.nombre || 'Sin asignar'}</div>
			</div>
		</div>

		<!-- Unidades -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title">Unidades de fabricación</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>N° Serie</th>
								<th>Estado</th>
								<th>Comentario</th>
								<th class="text-center">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each orden.unidadesConAcciones as unidad (unidad.id)}
								<tr class={unidad.es_defectuoso ? 'bg-error/10' : ''}>
									<td class="font-mono">{unidad.numero_serie}</td>
									<td>
										<span class="badge badge-sm badge-{unidad.estado?.color}">
											{unidad.estado?.nombre}
										</span>
									</td>
									<td>{unidad.estado.comentario}</td>
									<td class="text-right">
										<div class="flex flex-wrap justify-center gap-1">
											{#each unidad.acciones as accion (accion.id)}
												<button
													class="btn btn-xs {accion.nombre === 'Pausar'
														? 'btn-warning'
														: accion.nombre === 'Reanudar'
															? 'btn-success'
															: 'btn-primary'}"
													onclick={() => manejarAccion(unidad.id, accion)}
													disabled={isLoading}
												>
													{accion.nombre}
												</button>
											{:else}
												<span class="text-xs text-base-content/50">Sin acciones</span>
											{/each}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</PageLayout>

<Modal bind:open={modal.open} title={modal.titulo} onClose={cerrarModal}>
	{#if modal.tipo === 'pausa'}
		<div class="py-4">
			<textarea
				class="textarea w-full resize-none"
				rows="3"
				bind:value={comentario}
				placeholder={modal.mensaje}
			></textarea>
		</div>
	{:else if modal.tipo === 'eliminar'}
		<div class="py-4">
			<p>{modal.mensaje}</p>
		</div>
	{/if}

	{#snippet actions()}
		<button class="btn" onclick={cerrarModal}>Cancelar</button>
		<button
			class="btn {modal.tipo === 'eliminar' ? 'btn-error' : 'btn-primary'}"
			onclick={modal.onConfirm}
			disabled={isLoading}
		>
			{modal.tipo === 'eliminar' ? 'Eliminar' : 'Confirmar'}
		</button>
	{/snippet}
</Modal>
