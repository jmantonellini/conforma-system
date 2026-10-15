<script lang="ts">
	import { PageLayout, Table } from '$lib/components/ui';
	import { getTareas } from '$lib/remote/tareas.remote';
	import { formatearFecha } from '$lib/utils/fechas';
	import { EstadosTarea } from '$lib/types';

	let tareas = $derived(await getTareas());

	const estadoMap: Record<EstadosTarea, { label: string; color: string }> = {
		[EstadosTarea.PENDIENTE]: { label: 'Pendiente', color: 'badge-warning' },
		[EstadosTarea.EN_PROGRESO]: { label: 'En progreso', color: 'badge-info' },
		[EstadosTarea.COMPLETADA]: { label: 'Completada', color: 'badge-success' }
	};

	const prioridadMap = {
		alta: { label: 'Alta', color: 'badge-error' },
		media: { label: 'Media', color: 'badge-warning' },
		baja: { label: 'Baja', color: 'badge-success' }
	} as const;
</script>

<PageLayout>
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-0">
			{#snippet headerTareas()}
				<th>Estado</th>
				<th>Título</th>
				<th>Asignado</th>
				<th>Prioridad</th>
				<th>Entrega</th>
			{/snippet}

			{#snippet rowTarea(t: (typeof tareas)[number])}
				<td>
					<span class="badge {estadoMap[t.estado].color} badge-sm">
						{estadoMap[t.estado].label}
					</span>
				</td>
				<td>
					<div class="font-medium">{t.titulo}</div>
					{#if t.descripcion}
						<div class="max-w-md text-sm text-base-content/60">{t.descripcion}</div>
					{/if}
				</td>
				<td>
					{#if t.empleado?.nombre}
						{t.empleado.nombre} {t.empleado.apellido ?? ''}
					{:else}
						-
					{/if}
				</td>
				<td>
					<span class="badge {prioridadMap[t.prioridad].color} badge-sm">
						{prioridadMap[t.prioridad].label}
					</span>
				</td>
				<td>
					{#if t.fecha_entrega}
						<span>{formatearFecha(new Date(t.fecha_entrega))}</span>
					{:else}
						-
					{/if}
				</td>
			{/snippet}

			<Table
				data={tareas}
				header={headerTareas}
				row={rowTarea}
				emptyMessage="No hay tareas pendientes"
			/>
		</div>
	</div>
</PageLayout>
