<script lang="ts">
	import KanbanColumn from './KanbanColumn.svelte';
	import type { Tarea } from '$lib/server/db/schema';
	import { EstadosTarea } from '$lib/types';

	let {
		tareas = [],
		onEstadoChange = () => {},
		onReorder = () => {},
		onEliminar = () => {}
	}: {
		tareas: Tarea[];
		onEstadoChange?: (id: number, nuevoEstado: EstadosTarea) => void;
		onReorder?: (tareas: { id: number; orden: number }[]) => void;
		onEliminar?: (id: number) => void;
	} = $props();

	const columnas = [
		{ estado: EstadosTarea.PENDIENTE, titulo: 'Pendientes', color: 'warning' },
		{ estado: EstadosTarea.EN_PROGRESO, titulo: 'En Progreso', color: 'info' },
		{ estado: EstadosTarea.COMPLETADA, titulo: 'Completadas', color: 'success' }
	];


  
	function getTareasPorColumna(estado: EstadosTarea) {
		return tareas
			.filter((t) => t.estado === estado)
			.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
	}

	function handleReorder(items: Tarea[]) {
		const updates = items.map((item, index) => ({
			id: item.id,
			orden: index
		}));
		onReorder(updates);
	}
</script>

<div class="grid gap-4 overflow-x-auto md:grid-cols-3">
	{#each columnas as columna (columna.estado)}
		<KanbanColumn
			estado={columna.estado}
			titulo={columna.titulo}
			color={columna.color}
			tareas={getTareasPorColumna(columna.estado)}
			{onEstadoChange}
			{onEliminar}
			onReorder={handleReorder}
		/>
	{/each}
</div>
