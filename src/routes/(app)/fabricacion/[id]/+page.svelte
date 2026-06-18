<script lang="ts">
	import {
		getOrdenFabricacion,
		actualizarEstadoOrden,
		actualizarEstadoUnidad
	} from '$lib/remote/fabricacion.remote';
	import { getEstadosFabricacion } from '$lib/remote/fabricacion.remote';
	import { PageLayout, PageHeader } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { params } = $props();
	let id = $derived(params.id);
	const orden = $derived(await getOrdenFabricacion(Number(id)));
	const estados = await getEstadosFabricacion();

	let selectedEstado = $derived(orden.estado?.id ?? 1);
	let isLoading = $state(false);

	async function cambiarEstadoOrden() {
		if (isLoading) return;
		isLoading = true;
		try {
			await actualizarEstadoOrden({
				orden_id: orden.id,
				estado_id: selectedEstado
			});
			toast.success('Estado actualizado');
			goto(resolve(`/fabricacion/${orden.id}`));
		} catch (error) {
			console.log(error);

			toast.error('Error al actualizar estado');
		} finally {
			isLoading = false;
		}
	}

	async function cambiarEstadoUnidad(unidadId: number, estadoId: number) {
		try {
			await actualizarEstadoUnidad({ unidad_id: String(unidadId), estado_id: String(estadoId) });
			toast.success('Unidad actualizada');
			goto(resolve(`/fabricacion/${orden.id}`));
		} catch (error) {
			console.log(error);

			toast.error('Error al actualizar unidad');
		}
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-4">
		<PageHeader title={`Orden de Fabricación #${orden.id}`} />

		<div class="mb-6 flex items-center justify-between">
			<div>
				<p class="text-lg font-semibold">{orden.nombre_trabajo}</p>
				<p class="text-sm text-base-content/70">
					Pedido: {orden.pedido_numero} · Producto: {orden.producto_nombre || 'Personalizado'}
				</p>
			</div>
			<a href={resolve('/fabricacion')} class="btn btn-ghost btn-sm">← Volver</a>
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

		<!-- Cambiar estado de la orden -->
		<fieldset class="mb-6 fieldset rounded-box border border-base-300 p-4">
			<legend class="fieldset-legend px-2 font-semibold">Cambiar estado de la orden</legend>
			<div class="flex flex-wrap items-end gap-4">
				<div class="min-w-50 flex-1">
					<select
						value={selectedEstado}
						onchange={(e) => (selectedEstado = Number(e.currentTarget.value))}
						class="select w-full"
					>
						{#each estados as e (e.id)}
							<option value={e.id}>{e.nombre}</option>
						{/each}
					</select>
				</div>
				<button class="btn btn-primary" onclick={cambiarEstadoOrden} disabled={isLoading}>
					{isLoading ? 'Actualizando...' : 'Actualizar estado'}
				</button>
			</div>
		</fieldset>

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
								<th class="text-center">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each orden.unidades as unidad (unidad.id)}
								<tr class={unidad.es_defectuoso ? 'bg-error/10' : ''}>
									<td class="font-mono">{unidad.numero_serie}</td>
									<td>
										<span class="badge badge-sm badge-{unidad.estado?.color}">
											{unidad.estado?.nombre}
										</span>
									</td>
									<td class="text-right">
										<select
											class="select w-32 select-sm"
											onchange={(e) =>
												cambiarEstadoUnidad(unidad.id, parseInt(e.currentTarget.value))}
										>
											{#each estados as e (e.id)}
												<option value={e.id} selected={e.id === unidad.estado?.id}
													>{e.nombre}</option
												>
											{/each}
										</select>
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
