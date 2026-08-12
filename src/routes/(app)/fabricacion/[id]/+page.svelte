<script lang="ts">
	import {
		getOrdenFabricacion,
		cambiarEstadoUnidad,
		reanudarUnidad,
		eliminarOrdenFabricacion,
		getHistorialUnidades
	} from '$lib/remote/fabricacion.remote';
	import { PageLayout, Modal, Table } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatearFecha } from '$lib/utils/fechas.js';

	let { params } = $props();
	const orden = $derived(await getOrdenFabricacion(Number(params.id)));
	const historial = $derived(await getHistorialUnidades(Number(params.id)));

	let isLoading = $state(false);

	let modal = $state({
		open: false,
		tipo: 'pausa' as 'pausa' | 'eliminar',
		titulo: '',
		mensaje: '',
		onConfirm: () => {}
	});

	let comentario = $state('');

	async function cambiarEstado(unidadId: number, estadoDestinoId: number, comentarioText?: string) {
		if (isLoading) return;
		isLoading = true;
		try {
			await cambiarEstadoUnidad({
				unidad_id: String(unidadId),
				estado_destino_id: String(estadoDestinoId),
				comentario: comentarioText
			});
			toast.success('Estado cambiado');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Error');
		} finally {
			isLoading = false;
		}
	}

	async function reanudar(unidadId: number, comentarioText?: string) {
		if (isLoading) return;
		isLoading = true;
		try {
			await reanudarUnidad({
				unidad_id: String(unidadId),
				comentario: comentarioText
			});
			toast.success('Unidad reanudada');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Error');
		} finally {
			isLoading = false;
		}
	}

	function manejarPausa(unidadId: number) {
		modal = {
			open: true,
			tipo: 'pausa',
			titulo: 'Motivo de la pausa',
			mensaje: 'Describe el motivo de la pausa...',
			onConfirm: async () => {
				// Buscar el estado "pausado" entre las transiciones disponibles
				const unidad = orden.unidades.find((u) => u.id === unidadId);
				const estadoPausado = unidad?.transiciones_disponibles.find((t) => t.slug === 'pausado');
				if (estadoPausado) {
					await cambiarEstado(unidadId, estadoPausado.id, comentario.trim());
				}
				modal.open = false;
				comentario = '';
			}
		};
	}

	function manejarEliminar() {
		modal = {
			open: true,
			tipo: 'eliminar',
			titulo: 'Eliminar Orden de Fabricación',
			mensaje: '¿Seguro que quieres eliminar esta orden?',
			onConfirm: async () => {
				await eliminarOrdenFabricacion(String(orden.id));
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
		<p class="text-sm text-base-content/70">
			Pedido: {orden.pedido_numero} · Producto: {orden.producto_nombre || 'Personalizado'}
		</p>
		<div class="flex items-center justify-between">
			<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>
			<button class="btn btn-outline btn-error btn-sm" onclick={manejarEliminar}> Eliminar </button>
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
				></progress>
			</div>
			<div class="stat bg-base-200">
				<div class="stat-title">Cliente</div>
				<div class="stat-value text-lg">{orden.cliente_nombre}</div>
			</div>
			<div class="stat bg-base-200">
				<div class="stat-title">Estado</div>
				<div class="stat-value">
					<span
						class={`badge badge-soft whitespace-nowrap capitalize badge-${orden.estado?.color}`}
					>
						{orden.estado?.nombre}
					</span>
				</div>
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
				<div class="stat-value text-lg">{orden.empleado?.nombre || 'Sin asignar'}</div>
			</div>
		</div>

		<!-- Unidades -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title">Unidades de fabricación</h3>
				{#snippet headerUnidades()}
					<th>N° Serie</th>
					<th>Estado</th>
					<th>Comentario</th>
					<th class="text-center">Acciones</th>
				{/snippet}
				{#snippet rowUnidad(unidad)}
					<td class="font-mono">{unidad.numero_serie}</td>
					<td>
						<span class="badge badge-sm" style="background-color: {unidad.estado?.color}">
							{unidad.estado?.nombre}
						</span>
					</td>
					<td>{unidad.comentario_estado ?? ''}</td>
					<td>
						<div class="flex flex-wrap justify-center gap-1">
							{#if unidad.esta_pausada}
								<button
									class="btn btn-outline btn-success btn-xs"
									onclick={() => reanudar(unidad.id)}
									disabled={isLoading}
								>
									Reanudar
								</button>
							{:else}
								{#each unidad.transiciones_disponibles as transicion (transicion.id)}
									<button
										class="btn btn-{transicion.color} btn-outline btn-xs"
										onclick={() =>
											transicion.slug === 'pausado'
												? manejarPausa(unidad.id)
												: cambiarEstado(unidad.id, transicion.id)}
										disabled={isLoading}
									>
										{transicion.nombre}
									</button>
								{:else}
									<span class="text-xs text-base-content/50">Sin acciones</span>
								{/each}
							{/if}
						</div>
					</td>
				{/snippet}
				<Table data={orden.unidades} header={headerUnidades} row={rowUnidad} />
			</div>
		</div>

		<!-- Historial de cambios -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title">Historial de cambios</h3>
				{#snippet headerHistorial()}
					<th>Unidad</th>
					<th>Fecha</th>
					<th>Estado anterior</th>
					<th>Estado nuevo</th>
					<th>Empleado</th>
					<th>Comentario</th>
				{/snippet}
				{#snippet rowHistorial(log)}
					<td class="font-mono">{log.unidad || '-'}</td>
					<td>{log.fecha ? formatearFecha(new Date(log.fecha)) : '-'}</td>
					<td>
						<span class="badge badge-soft badge-sm badge-{log.estado_anterior?.color || 'ghost'}">
							{log.estado_anterior?.nombre || '-'}
						</span>
					</td>
					<td>
						<span class="badge badge-soft badge-sm badge-{log.estado_nuevo?.color || 'ghost'}">
							{log.estado_nuevo?.nombre || '-'}
						</span>
					</td>
					<td class="text-right">{log.empleado || '-'}</td>
					<td class="text-right">{log.comentario || '-'}</td>
				{/snippet}
				<Table
					data={historial}
					header={headerHistorial}
					row={rowHistorial}
					emptyMessage="Sin movimientos registrados"
				/>
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
