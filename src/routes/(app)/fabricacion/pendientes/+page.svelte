<script lang="ts">
	import { resolve } from '$app/paths';
	import { EstadoBadge, Icono, PageLayout } from '$lib/ui';
	import { getTrabajosPendientes } from '$lib/modulos/fabricacion/pendientes.remote';
	import { ETIQUETA_PRIORIDAD } from '$lib/modulos/fabricacion/tipos';
	import { ETIQUETA_TIPO_TRABAJO, TIPO_TRABAJO_COLOR } from '$lib/modulos/ventas/trabajo';
	import { diasHasta, formatearFecha } from '$lib/utils/fechas';

	const grupos = $derived(await getTrabajosPendientes());
	const trabajos = $derived(grupos.flatMap((grupo) => grupo.trabajos));
	const totalOrdenes = $derived(trabajos.filter((trabajo) => trabajo.orden).length);
	const totalSinOrden = $derived(trabajos.length - totalOrdenes);
	const totalPedidos = $derived(grupos.filter((grupo) => grupo.pedido).length);
	const hoy = new Date().toLocaleDateString('es-AR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	function plazo(fecha: Date | null) {
		if (!fecha) return null;
		const dias = diasHasta(fecha);
		if (dias < 0)
			return { texto: `vencida hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`, vencida: true };
		if (dias === 0) return { texto: 'hoy', vencida: true };
		if (dias === 1) return { texto: 'mañana', vencida: false };
		return { texto: `en ${dias} días`, vencida: false };
	}
</script>

<svelte:head><title>Trabajos pendientes</title></svelte:head>

<PageLayout>
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div class="flex flex-col gap-1">
			<a
				class="inline-flex w-fit items-center gap-1 text-sm text-base-content/60 hover:text-base-content print:hidden"
				href={resolve('/fabricacion')}
			>
				<Icono nombre="izquierda" /> Fabricación
			</a>
			<h1 class="text-2xl font-semibold tracking-tight">Trabajos pendientes</h1>
			<p class="text-sm text-base-content/70">
				<span class="first-letter:uppercase">{hoy}</span> · {totalPedidos}
				{totalPedidos === 1 ? 'pedido' : 'pedidos'} · {totalOrdenes}
				{totalOrdenes === 1 ? 'orden' : 'órdenes'} sin terminar
				{#if totalSinOrden}
					· {totalSinOrden}
					{totalSinOrden === 1 ? 'producto' : 'productos'} sin OF
				{/if}
			</p>
		</div>
		<button class="btn btn-primary btn-sm print:hidden" onclick={() => window.print()}>
			<Icono nombre="imprimir" /> Imprimir
		</button>
	</header>

	{#if grupos.length}
		<div class="flex flex-col gap-4 [print-color-adjust:exact] print:gap-3">
			{#each grupos as grupo (grupo.clave)}
				{@const vence = plazo(grupo.pedido?.entrega ?? null)}
				<section class="flex break-inside-avoid flex-col gap-3 seccion print:p-3">
					<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
						<div class="min-w-0">
							<h2 class="text-lg font-semibold">
								{#if grupo.pedido}
									<a class="link link-hover" href={resolve(`/pedidos/${grupo.pedido.id}`)}>
										{grupo.pedido.numero}
									</a>
									<span class="text-base-content/40">·</span>
									{grupo.cliente ?? 'Sin cliente'}
								{:else}
									Para stock
								{/if}
							</h2>
							{#if grupo.pedido}
								<p class="secundario">Pedido del {formatearFecha(grupo.pedido.fecha)}</p>
							{/if}
						</div>
						{#if grupo.pedido}
							<div class="flex flex-wrap items-center gap-2 text-sm">
								{#if grupo.pedido.tipo_trabajo && grupo.pedido.tipo_trabajo !== 'fabricacion'}
									<span class={['badge badge-soft', TIPO_TRABAJO_COLOR[grupo.pedido.tipo_trabajo]]}>
										{ETIQUETA_TIPO_TRABAJO[grupo.pedido.tipo_trabajo]}
									</span>
								{/if}
								<EstadoBadge estado={grupo.pedido.estado} />
								<span class={['whitespace-nowrap', vence?.vencida && 'font-semibold text-error']}>
									Entrega:
									{#if grupo.pedido.entrega}
										{formatearFecha(grupo.pedido.entrega)} ({vence?.texto})
									{:else}
										sin fecha
									{/if}
								</span>
							</div>
						{/if}
					</div>

					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th class="w-px">Orden</th>
									<th>Qué se fabrica</th>
									<th class="w-px text-center">Cant.</th>
									<th class="w-px">Estado</th>
									<th class="w-px">Responsable</th>
									<th class="w-px">Termina</th>
								</tr>
							</thead>
							<tbody>
								{#each grupo.trabajos as orden (orden.clave)}
									{@const prioridad = orden.prioridad ? ETIQUETA_PRIORIDAD[orden.prioridad] : null}
									<tr class="align-top">
										<td>
											{#if orden.orden}
												<a
													class="link font-mono whitespace-nowrap link-hover"
													href={resolve(`/fabricacion/${orden.orden}`)}
												>
													OF-{orden.orden}
												</a>
											{:else}
												<span class="badge badge-soft whitespace-nowrap badge-warning">Sin OF</span>
											{/if}
										</td>
										<td>
											<p class="font-medium">
												{orden.que}
												{#if prioridad}
													<span class={['badge badge-xs', `badge-${prioridad.color}`]}>
														{prioridad.nombre}
													</span>
												{/if}
											</p>
											{#if orden.detalle}<p class="secundario">{orden.detalle}</p>{/if}
											{#if orden.personalizada}<p class="secundario">{orden.personalizada}</p>{/if}
											{#if orden.observaciones}
												<p class="mt-1 text-xs whitespace-pre-line italic">{orden.observaciones}</p>
											{/if}
										</td>
										<td class="text-center">
											{orden.cantidad}
											{#if orden.terminadas}
												<p class="secundario whitespace-nowrap">{orden.terminadas} listos</p>
											{/if}
										</td>
										<td>
											{#if orden.orden}
												<EstadoBadge estado={orden.estado} />
											{:else}
												<span class="secundario whitespace-nowrap">Por empezar</span>
											{/if}
										</td>
										<td class="whitespace-nowrap">{orden.responsable ?? '-'}</td>
										<td class="whitespace-nowrap">{formatearFecha(orden.estimada)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/each}
		</div>
	{:else}
		<p class="seccion text-center text-base-content/60">No hay trabajos pendientes.</p>
	{/if}
</PageLayout>
