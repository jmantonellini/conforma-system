<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getNotificaciones, marcarNotificacionesLeidas } from '$lib/remote/cotizaciones.remote';
	import { formatearFecha } from '$lib/utils/fechas';

	let notificaciones = $state(await getNotificaciones());
	let abierto = $state(false);

	let noLeidas = $derived(notificaciones.filter((n) => !n.leida).length);

	async function abrir() {
		abierto = !abierto;
		if (abierto && noLeidas > 0) {
			await marcarNotificacionesLeidas();
			notificaciones = await getNotificaciones();
		}
	}

	async function ir(n: { link: string | null }) {
		abierto = false;
		if (n.link) {
			await goto(resolve(n.link));
			await invalidateAll();
		}
	}

	// Refrescar cada 60 segundos
	$effect(() => {
		const interval = setInterval(async () => {
			notificaciones = await getNotificaciones();
		}, 60000);
		return () => clearInterval(interval);
	});
</script>

<div class="dropdown dropdown-end">
	<button class="btn btn-circle btn-ghost" onclick={abrir} aria-label="Notificaciones">
		<div class="indicator">
			<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
				/>
			</svg>
			{#if noLeidas > 0}
				<span class="indicator-item badge badge-xs badge-error">{noLeidas}</span>
			{/if}
		</div>
	</button>

	{#if abierto}
		<div
			class="dropdown-content z-50 mt-2 w-80 rounded-box border border-base-300 bg-base-100 shadow-lg"
		>
			<div class="border-b border-base-300 p-3 font-bold">Notificaciones</div>
			<ul class="max-h-96 overflow-y-auto">
				{#each notificaciones as n (n.id)}
					<li>
						<button
							class="w-full p-3 text-left hover:bg-base-200 {n.leida ? 'opacity-60' : ''}"
							onclick={() => ir(n)}
						>
							<p class="text-sm font-medium">{n.titulo}</p>
							<p class="line-clamp-2 text-xs text-base-content/70">{n.mensaje}</p>
							<p class="mt-1 text-xs text-base-content/50">{formatearFecha(n.created_at)}</p>
						</button>
					</li>
				{:else}
					<li class="p-4 text-center text-sm text-base-content/50">Sin notificaciones</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
