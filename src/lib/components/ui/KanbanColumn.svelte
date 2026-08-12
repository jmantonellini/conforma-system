<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Tarea } from '$lib/server/db/schema';
	import type { EstadosTarea } from '$lib/types';
	import { Calendar, User } from './icons';
	import { formatearFecha } from '$lib/utils/fechas';

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
		tareas: Tarea[];
		onEstadoChange?: (id: number, nuevoEstado: EstadosTarea) => void;
		onEliminar?: (id: number) => void;
		onReorder?: (items: Tarea[]) => void;
	} = $props();

	let isDragOver = $state(false);
	let dragOverId = $state<number | null>(null);

	function onDragStart(event: DragEvent, tarea: Tarea) {
		event.dataTransfer!.effectAllowed = 'move';
		event.dataTransfer!.setData(
			'application/json',
			JSON.stringify({
				id: tarea.id,
				estadoOrigen: tarea.estado
			})
		);
	}

	function onDragOver(event: DragEvent, tareaId?: number) {
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'move';
		isDragOver = true;
		dragOverId = tareaId ?? null;
	}

	function onDragLeave() {
		isDragOver = false;
		dragOverId = null;
	}

	function onDropColumna(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		dragOverId = null;

		const data = event.dataTransfer?.getData('application/json');
		if (!data) return;

		const { id, estadoOrigen } = JSON.parse(data);
		if (estadoOrigen === estado) return;

		onEstadoChange(id, estado);
	}

	function onDropReordenar(event: DragEvent, targetTarea: Tarea) {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = false;
		dragOverId = null;

		const data = event.dataTransfer?.getData('application/json');
		if (!data) return;

		const { id, estadoOrigen } = JSON.parse(data);

		// Si viene de otra columna, cambiamos estado
		if (estadoOrigen !== estado) {
			onEstadoChange(id, estado);
			return;
		}

		const dragIndex = tareas.findIndex((t) => t.id === id);
		const targetIndex = tareas.findIndex((t) => t.id === targetTarea.id);

		if (dragIndex === -1 || dragIndex === targetIndex) return;

		const newTareas = [...tareas];
		const [removed] = newTareas.splice(dragIndex, 1);
		newTareas.splice(targetIndex, 0, removed);

		onReorder(newTareas);
	}

	function isDropTarget(tareaId: number) {
		return dragOverId === tareaId && isDragOver;
	}
</script>

<div
	class="flex min-w-[20rem] flex-col rounded-lg p-4 transition-colors duration-200 {isDragOver
		? 'bg-base-300 ring-2 ring-primary/50'
		: 'bg-base-200'}"
	ondragover={(e) => onDragOver(e)}
	ondragleave={onDragLeave}
	ondrop={onDropColumna}
	role="list"
	aria-label={titulo}
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-center text-xl font-bold">{titulo}</h2>
		<span class="badge badge-{color} badge-sm">{tareas.length}</span>
	</div>

	<div class="flex flex-1 flex-col gap-2">
		{#each tareas as tarea (tarea.id)}
			<div
				animate:flip={{ duration: 250, easing: quintOut }}
				in:fly={{ y: 20, duration: 250, delay: 50 }}
				out:fade={{ duration: 150 }}
			>
				<!-- Indicador de drop arriba -->
				<div
					class="h-1 rounded-full bg-primary transition-all duration-150 {isDropTarget(tarea.id)
						? 'scale-x-100 opacity-100'
						: 'scale-x-0 opacity-0'}"
					aria-hidden="true"
				></div>

				<div
					role="listitem"
					class="group card cursor-grab bg-base-100 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.98] active:cursor-grabbing"
					draggable="true"
					ondragstart={(e) => onDragStart(e, tarea)}
					ondragover={(e) => onDragOver(e, tarea.id)}
					ondragleave={onDragLeave}
					ondrop={(e) => onDropReordenar(e, tarea)}
				>
					<div class="card-body p-4">
						<div class="flex items-start justify-between gap-2">
							<h3 class="card-title text-base">{tarea.titulo}</h3>
							<button
								class="btn btn-circle btn-ghost text-error opacity-0 transition-opacity btn-xs group-hover:opacity-100"
								onclick={() => onEliminar(tarea.id)}
								title="Eliminar tarea"
							>
								✕
							</button>
						</div>

						{#if tarea.descripcion}
							<p class="line-clamp-2 text-sm text-base-content/70">{tarea.descripcion}</p>
						{/if}

						<div
							class="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-base-content/50"
						>
							{#if tarea.empleado?.nombre}
								<span class="flex items-center gap-1">
									<User class="size-4" />
									{tarea.empleado.nombre}
									{tarea.empleado.apellido ?? ''}
								</span>
							{/if}
							{#if tarea.fecha_entrega}
								<span
									class="flex items-center gap-1"
									class:text-error={new Date(tarea.fecha_entrega) < new Date()}
								>
									<Calendar class="size-4" />
									{formatearFecha(new Date(tarea.fecha_entrega))}
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div
				class="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-base-300 py-8 transition-colors {isDragOver
					? 'border-primary bg-primary/5'
					: ''}"
				in:fade={{ duration: 200 }}
			>
				<p class="text-sm text-base-content/30">Arrastrá tareas aquí</p>
			</div>
		{/each}
	</div>
</div>
