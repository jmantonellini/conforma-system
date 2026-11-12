<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import Icono from '$lib/ui/Icono.svelte';
	import { estiloNotificacion } from '../estilos';
	import { haceCuanto } from '$lib/utils/fechas';
	import {
		getNotificaciones,
		marcarNotificacionLeida,
		marcarNotificacionesLeidas
	} from '../notificaciones.remote';

	type Notificacion = Awaited<ReturnType<typeof getNotificaciones>>[number];

	const id = $props.id();
	let panel = $state<HTMLElement>();
	const notificaciones = $derived(await getNotificaciones());
	const noLeidas = $derived(notificaciones.filter((n) => !n.leida).length);
	let soloSinLeer = $state(false);
	const visibles = $derived(soloSinLeer ? notificaciones.filter((n) => !n.leida) : notificaciones);

	$effect(() => {
		const intervalo = setInterval(() => getNotificaciones().refresh(), 60_000);
		return () => clearInterval(intervalo);
	});

	async function abrir(notificacion: Notificacion) {
		panel?.hidePopover();
		if (!notificacion.leida) await marcarNotificacionLeida(notificacion.id);
		if (notificacion.link) await goto(resolve(notificacion.link as Pathname as '/'));
	}
</script>

<button
	type="button"
	class="btn btn-square btn-ghost btn-sm"
	title="Notificaciones"
	aria-label={noLeidas ? `Notificaciones (${noLeidas} sin leer)` : 'Notificaciones'}
	popovertarget={id}
	style:anchor-name="--{id}"
>
	<span class="indicator">
		<Icono nombre="campana" class="size-5" />
		{#if noLeidas}
			<span class="indicator-item badge badge-xs badge-error">{noLeidas > 9 ? '9+' : noLeidas}</span
			>
		{/if}
	</span>
</button>

<div
	{id}
	bind:this={panel}
	popover
	class="dropdown dropdown-end w-[min(24rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-0 shadow-lg"
	style:position-anchor="--{id}"
>
	<header class="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-2.5">
		<div role="tablist" class="tabs-box tabs tabs-xs">
			<button
				role="tab"
				class={['tab', !soloSinLeer && 'tab-active']}
				aria-selected={!soloSinLeer}
				onclick={() => (soloSinLeer = false)}>Recientes</button
			>
			<button
				role="tab"
				class={['tab', soloSinLeer && 'tab-active']}
				aria-selected={soloSinLeer}
				onclick={() => (soloSinLeer = true)}>Sin leer{noLeidas ? ` (${noLeidas})` : ''}</button
			>
		</div>
		{#if noLeidas}
			<button class="link text-xs link-primary" onclick={() => marcarNotificacionesLeidas()}>
				Marcar todas como leídas
			</button>
		{/if}
	</header>
	<ul class="max-h-[28rem] divide-y divide-base-300 overflow-y-auto">
		{#each visibles as notificacion (notificacion.id)}
			{@const estilo = estiloNotificacion(notificacion.modulo)}
			<li>
				<button
					class={[
						'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-base-200/60',
						!notificacion.leida && 'bg-primary/5'
					]}
					onclick={() => abrir(notificacion)}
				>
					<span class={['grid size-8 shrink-0 place-items-center rounded-full', estilo.clase]}>
						<Icono nombre={estilo.icono} />
					</span>
					<span class="min-w-0 flex-1">
						<span
							class={[
								'block text-sm',
								notificacion.leida ? 'text-base-content/70' : 'font-semibold'
							]}>{notificacion.titulo}</span
						>
						{#if notificacion.mensaje}
							<span class="mt-0.5 line-clamp-2 block text-xs text-base-content/60">
								{notificacion.mensaje}
							</span>
						{/if}
						<span class="mt-1 block text-xs text-base-content/50">
							{[estilo.etiqueta, haceCuanto(notificacion.created_at)].filter(Boolean).join(' · ')}
						</span>
					</span>
					{#if !notificacion.leida}
						<span class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer"
						></span>
					{/if}
				</button>
			</li>
		{:else}
			<li class="flex flex-col items-center gap-2 px-4 py-10 text-sm text-base-content/50">
				<Icono nombre={soloSinLeer ? 'check' : 'campana'} class="size-8" />
				{soloSinLeer ? 'Estás al día' : 'Sin novedades en los últimos 7 días'}
			</li>
		{/each}
	</ul>
	<footer class="border-t border-base-300 px-4 py-2.5 text-center">
		<a
			class="link text-xs link-primary"
			href={resolve('/notificaciones')}
			onclick={() => panel?.hidePopover()}>Ver historial completo</a
		>
	</footer>
</div>
