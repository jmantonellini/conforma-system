<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { Icono, PageLayout, filtrar, parametro } from '$lib/ui';
	import { formatearFechaHora, haceCuanto } from '$lib/utils/fechas';
	import { estiloNotificacion } from '$lib/modulos/notificaciones/estilos';
	import {
		getHistorialNotificaciones,
		marcarNotificacionLeida,
		marcarNotificacionesLeidas
	} from '$lib/modulos/notificaciones/notificaciones.remote';

	const pagina = $derived(Math.max(1, Number(parametro('page', '1')) || 1));
	const soloSinLeer = $derived(parametro('filtro') === 'sin-leer');
	const historial = $derived(await getHistorialNotificaciones({ pagina, soloSinLeer }));

	type Notificacion = (typeof historial.items)[number];

	async function abrir(notificacion: Notificacion) {
		if (!notificacion.leida) await marcarNotificacionLeida(notificacion.id);
		if (notificacion.link) await goto(resolve(notificacion.link as Pathname as '/'));
	}
</script>

<PageLayout>
	<header class="encabezado-fijo flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Notificaciones</h1>
			<p class="text-sm text-base-content/60">
				Las leídas se borran a los 30 días y el resto a los 90.
			</p>
		</div>
		<button class="btn btn-sm" onclick={() => marcarNotificacionesLeidas()}>
			<Icono nombre="check" /> Marcar todas como leídas
		</button>
	</header>

	<div class="card overflow-hidden">
		<div class="flex items-center justify-between gap-2 border-b border-base-300 p-3">
			<div role="tablist" class="tabs-box tabs tabs-sm">
				<button
					role="tab"
					class={['tab', !soloSinLeer && 'tab-active']}
					aria-selected={!soloSinLeer}
					onclick={() => filtrar({ filtro: null })}>Todas</button
				>
				<button
					role="tab"
					class={['tab', soloSinLeer && 'tab-active']}
					aria-selected={soloSinLeer}
					onclick={() => filtrar({ filtro: 'sin-leer' })}>Sin leer</button
				>
			</div>
			<span class="text-sm text-base-content/60">{historial.total} en total</span>
		</div>

		<ul class="divide-y divide-base-300">
			{#each historial.items as notificacion (notificacion.id)}
				{@const estilo = estiloNotificacion(notificacion.modulo)}
				<li>
					<button
						class={[
							'flex w-full items-start gap-4 px-4 py-3.5 text-left transition-colors hover:bg-base-200/60',
							!notificacion.leida && 'bg-primary/5'
						]}
						onclick={() => abrir(notificacion)}
					>
						<span class={['grid size-9 shrink-0 place-items-center rounded-full', estilo.clase]}>
							<Icono nombre={estilo.icono} />
						</span>
						<span class="min-w-0 flex-1">
							<span
								class={[
									'block text-sm',
									notificacion.leida ? 'text-base-content/80' : 'font-semibold'
								]}>{notificacion.titulo}</span
							>
							{#if notificacion.mensaje}
								<span class="mt-0.5 block text-sm text-base-content/60">{notificacion.mensaje}</span
								>
							{/if}
						</span>
						<span
							class="shrink-0 text-right text-xs text-base-content/50"
							title={formatearFechaHora(notificacion.created_at)}
						>
							{estilo.etiqueta}
							<span class="block">{haceCuanto(notificacion.created_at)}</span>
						</span>
						{#if !notificacion.leida}
							<span class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer"
							></span>
						{/if}
					</button>
				</li>
			{:else}
				<li class="flex flex-col items-center gap-2 py-12 text-sm text-base-content/50">
					<Icono nombre={soloSinLeer ? 'check' : 'campana'} class="size-8" />
					{soloSinLeer ? 'No tenés notificaciones sin leer' : 'Todavía no hay notificaciones'}
				</li>
			{/each}
		</ul>

		{#if historial.paginas > 1}
			<footer
				class="flex items-center justify-between border-t border-base-300 px-4 py-2.5 text-sm text-base-content/60"
			>
				<span>Página {pagina} de {historial.paginas}</span>
				<div class="join">
					<button
						class="btn join-item btn-square btn-sm"
						aria-label="Página anterior"
						disabled={pagina <= 1}
						onclick={() => filtrar({ page: pagina - 1 })}><Icono nombre="izquierda" /></button
					>
					<button
						class="btn join-item btn-square btn-sm"
						aria-label="Página siguiente"
						disabled={pagina >= historial.paginas}
						onclick={() => filtrar({ page: pagina + 1 })}><Icono nombre="derecha" /></button
					>
				</div>
			</footer>
		{/if}
	</div>
</PageLayout>
