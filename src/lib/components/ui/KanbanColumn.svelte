<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Tarea } from '$lib/server/db/schema';
	import type { EstadosTarea } from '$lib/types';
	import { Calendar, User } from './icons';
	let {
		estado,
		titulo,
		color = 'base',
		tareas = [],
		onEstadoChange = () => {},
		onEliminar = () => {},
		onReorder = () => {}
	}: {
		estado: EstadosTarea;
		titulo: string;
		color?: string;
		tareas: any[];
		onEstadoChange?: (id: number, nuevoEstado: EstadosTarea) => void;
		onEliminar?: (id: number) => void;
		onReorder?: (items: any[]) => void;
	} = $props();

	let dragInfo = $state<{ id: number; estado: EstadosTarea } | null>(null);

	function onDragStart(event: DragEvent, tarea: Tarea) {
		dragInfo = { id: tarea.id, estado: tarea.estado };
		event.dataTransfer?.setData('text/plain', String(tarea.id));
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function onDropColumna(event: DragEvent) {
		event.preventDefault();
		if (!dragInfo) return;
		if (dragInfo.estado === estado) return;

		onEstadoChange(dragInfo.id, estado);
		dragInfo = null;
	}

	function onDropReordenar(event: DragEvent, targetTarea: Tarea) {
		event.preventDefault();
		if (!dragInfo || dragInfo.id === targetTarea.id) return;

		const dragIndex = tareas.findIndex((t) => t.id === dragInfo?.id);
		const targetIndex = tareas.findIndex((t) => t.id === targetTarea.id);

		if (dragIndex === -1 || targetIndex === -1) return;

		const newTareas = [...tareas];
		const [removed] = newTareas.splice(dragIndex, 1);
		newTareas.splice(targetIndex, 0, removed);

		onReorder(newTareas);
		dragInfo = null;
	}
</script>

<div
	class="min-w-[20rem] flex-col rounded-lg bg-base-200 p-4"
	ondragover={onDragOver}
	ondrop={onDropColumna}
	role="list"
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-center text-xl font-bold">{titulo}</h2>
		<span class="badge badge-{color} badge-sm">{tareas.length}</span>
	</div>

	<div class="flex flex-1 flex-col gap-2">
		{#each tareas as tarea (tarea.id)}
			<div
				role="listitem"
				class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
				draggable="true"
				ondragstart={(e) => onDragStart(e, tarea)}
				ondragover={onDragOver}
				ondrop={(e) => onDropReordenar(e, tarea)}
				transition:fly={{ y: 20, duration: 200 }}
			>
				<div class="card-body p-4">
					<div class="flex items-start justify-between gap-2">
						<h3 class="card-title text-base">{tarea.titulo}</h3>
						<button
							class="btn btn-circle text-error btn-ghost btn-xs"
							onclick={() => onEliminar(tarea.id)}
							title="Eliminar tarea"
						>
							✕
						</button>
					</div>

					{#if tarea.descripcion}
						<p class="text-sm text-base-content/70">{tarea.descripcion}</p>
					{/if}

					<div
						class="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-base-content/50"
					>
						{#if tarea.empleado.nombre}
							<span class="flex items-center gap-2"
								><User />{tarea.empleado.nombre} {tarea.empleado.apellido ?? ''}</span
							>
						{/if}
						{#if tarea.fecha_entrega}
							<span class="flex items-center gap-2"><Calendar /> {new Date(tarea.fecha_entrega).toLocaleDateString()}</span>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<p class="py-4 text-center text-sm text-base-content/30">Sin tareas</p>
		{/each}
	</div>
</div>
