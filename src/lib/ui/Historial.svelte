<script lang="ts" module>
	type EstadoLog = { nombre: string | null; color: string | null } | null;

	export type EventoHistorial = {
		id: string | number;
		fecha: Date | string | null;
		titulo?: string;
		tipo?: string;
		estado_anterior?: EstadoLog;
		estado_nuevo?: EstadoLog;
		detalle?: string | null;
		comentario?: string | null;
		empleado?: string | null;
		autor?: string | null;
		unidad?: string | null;
	};
</script>

<script lang="ts">
	import EstadoBadge from './EstadoBadge.svelte';
	import { claseStatus } from './colores';
	import { formatearFechaHora } from '$lib/utils/fechas';

	let {
		eventos,
		vacio = 'Sin movimientos registrados'
	}: { eventos: EventoHistorial[]; vacio?: string } = $props();

	const COLOR_TIPO: Record<string, string> = { pago: 'success', envio: 'info', entrega: 'success' };
	const color = (evento: EventoHistorial) =>
		evento.estado_nuevo?.color ?? COLOR_TIPO[evento.tipo ?? ''] ?? 'neutral';
</script>

{#if eventos.length}
	<ul class="timeline timeline-vertical timeline-compact timeline-snap-icon">
		{#each eventos as evento, indice (evento.id)}
			<li>
				{#if indice > 0}<hr />{/if}
				<div class="timeline-middle">
					<span class={['status status-lg', claseStatus(color(evento))]}></span>
				</div>
				<div class="timeline-end mb-4 flex min-w-0 flex-col gap-1">
					<div class="flex flex-wrap items-center gap-1.5 text-sm">
						{#if evento.unidad}<span class="font-mono font-medium">{evento.unidad}</span>{/if}
						{#if evento.estado_nuevo}
							<EstadoBadge class="badge-sm" estado={evento.estado_anterior ?? null} />
							{#if evento.estado_anterior?.nombre}<span class="text-base-content/40">→</span>{/if}
							<EstadoBadge class="badge-sm" estado={evento.estado_nuevo} />
						{:else if evento.titulo}
							<span class="font-medium">{evento.titulo}</span>
						{/if}
					</div>
					{#if evento.detalle ?? evento.comentario}
						<p class="text-sm whitespace-pre-wrap">{evento.detalle ?? evento.comentario}</p>
					{/if}
					<p class="text-xs text-base-content/60">
						{formatearFechaHora(evento.fecha)}
						{#if evento.autor ?? evento.empleado}· {evento.autor ?? evento.empleado}{/if}
					</p>
				</div>
				{#if indice < eventos.length - 1}<hr />{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-sm text-base-content/60">{vacio}</p>
{/if}
