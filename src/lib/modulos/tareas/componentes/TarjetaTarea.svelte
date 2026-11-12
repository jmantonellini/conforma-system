<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icono, Persona } from '$lib/ui';
	import { avisoVencimiento } from '$lib/utils/fechas';
	import type { TareaListada } from '../tareas.remote';
	import { EstadosTarea, prioridadTarea } from '../tipos';

	let {
		tarea,
		onAbrir,
		menu
	}: { tarea: TareaListada; onAbrir: () => void; menu?: Snippet<[TareaListada]> } = $props();

	const prioridad = $derived(prioridadTarea(tarea.prioridad));
	const completada = $derived(tarea.estado === EstadosTarea.COMPLETADA);
	const aviso = $derived(completada ? null : avisoVencimiento(tarea.fecha_entrega));
</script>

<article class="group rounded-box border border-base-300 bg-base-100 p-3 shadow-xs">
	<div class="flex items-start gap-2">
		<button
			type="button"
			class="min-w-0 flex-1 cursor-pointer text-left"
			onclick={onAbrir}
			aria-label="Abrir {tarea.titulo}"
		>
			<span class="flex items-center gap-2">
				<span class={['status', `status-${prioridad.color}`]} title="Prioridad {prioridad.etiqueta}"
				></span>
				<span class={['text-sm font-medium', completada && 'text-base-content/50 line-through']}>
					{tarea.titulo}
				</span>
			</span>
			{#if tarea.descripcion}
				<span class="mt-1 line-clamp-2 block text-xs text-base-content/60">{tarea.descripcion}</span
				>
			{/if}
		</button>
		{@render menu?.(tarea)}
	</div>
	{#if tarea.empleado?.nombre || tarea.fecha_entrega}
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
			<Persona nombre={tarea.empleado?.nombre} apellido={tarea.empleado?.apellido} vacio="" />
			{#if tarea.fecha_entrega}
				<span class={['flex items-center gap-1', aviso?.clase ?? 'secundario']}>
					<Icono nombre="calendario" class="size-3.5" />
					{aviso?.texto ?? new Date(tarea.fecha_entrega).toLocaleDateString('es-AR')}
				</span>
			{/if}
		</div>
	{/if}
</article>
