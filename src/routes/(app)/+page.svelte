<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { EstadoBadge, Icono, PageLayout, Persona, Seccion } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { can } from '$lib/utils/permissions';
	import { avisoVencimiento, formatearFecha } from '$lib/utils/fechas';
	import { getOrdenesFabricacion } from '$lib/modulos/fabricacion/fabricacion-consultas.remote';
	import { ETIQUETA_PRIORIDAD } from '$lib/modulos/fabricacion/tipos';
	import { getResumenInicio } from '$lib/modulos/inicio/inicio.remote';
	import { getTareas, moverTarea } from '$lib/modulos/tareas/tareas.remote';
	import { EstadosTarea, prioridadTarea } from '$lib/modulos/tareas/tipos';

	const usuario = $derived(page.data.user);
	const verFabricacion = can(page.data.user, page.data.permisos, 'fabricacion', 'view');

	const resumen = $derived(await getResumenInicio());
	const ordenes = $derived(
		verFabricacion ? (await getOrdenesFabricacion({ soloActivas: true, limit: 8 })).ordenes : []
	);
	const tareas = $derived(await getTareas({}));

	const misTareas = $derived(
		tareas
			.filter(
				(t) =>
					t.estado !== EstadosTarea.COMPLETADA &&
					(!usuario?.empleado_id || t.asignado_a === usuario.empleado_id)
			)
			.toSorted(
				(a, b) =>
					(a.fecha_entrega ? +new Date(a.fecha_entrega) : Infinity) -
					(b.fecha_entrega ? +new Date(b.fecha_entrega) : Infinity)
			)
			.slice(0, 6)
	);

	const indicadores = $derived(
		[
			{
				etiqueta: 'Cotizaciones abiertas',
				valor: resumen.cotizacionesAbiertas,
				href: '/cotizaciones'
			},
			{ etiqueta: 'Pedidos en curso', valor: resumen.pedidosEnCurso, href: '/pedidos' },
			{
				etiqueta: 'Entregas vencidas',
				valor: resumen.entregasVencidas,
				href: '/pedidos',
				alerta: !!resumen.entregasVencidas,
				detalle: resumen.entregasSemana ? `${resumen.entregasSemana} esta semana` : undefined
			},
			{ etiqueta: 'Unidades en producción', valor: resumen.enProduccion, href: '/fabricacion' }
		].filter((indicador) => indicador.valor !== null)
	);

	const saludo = $derived.by(() => {
		const hora = new Date().getHours();
		return hora < 12 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
	});
	const hoy = new Date().toLocaleDateString('es-AR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});

	async function completar(id: number) {
		try {
			await moverTarea({ id, estado: EstadosTarea.COMPLETADA });
			toast.success('Tarea completada');
		} catch {
			toast.error('No se pudo completar la tarea');
		}
	}
</script>

<PageLayout>
	<header>
		<p class="text-sm text-base-content/60 first-letter:uppercase">{hoy}</p>
		<h1 class="text-2xl font-semibold tracking-tight">
			{saludo}, {usuario?.empleado?.nombre ?? usuario?.username}
		</h1>
	</header>

	{#if indicadores.length}
		<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#each indicadores as indicador (indicador.etiqueta)}
				<a
					href={resolve(indicador.href as Pathname as '/')}
					class="flex flex-col gap-1 seccion transition-colors hover:border-primary"
				>
					<span class="text-sm text-base-content/60">{indicador.etiqueta}</span>
					<span class={['text-3xl font-semibold tabular-nums', indicador.alerta && 'text-error']}
						>{indicador.valor}</span
					>
					{#if indicador.detalle}<span class="secundario">{indicador.detalle}</span>{/if}
				</a>
			{/each}
		</section>
	{/if}

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
		{#if verFabricacion}
			<Seccion
				titulo="Producción en curso"
				descripcion="Órdenes activas, de mayor a menor prioridad."
				class="lg:col-span-2"
			>
				{#snippet acciones()}
					<a class="link text-sm link-primary" href={resolve('/fabricacion')}>Ver todas</a>
				{/snippet}
				{#if ordenes.length}
					<ul class="-my-2 divide-y divide-base-300">
						{#each ordenes as orden (orden.id)}
							{@const prioridad = ETIQUETA_PRIORIDAD[orden.prioridad ?? 0]}
							{@const aviso = avisoVencimiento(orden.fecha_fin_estimada)}
							<li
								class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_8rem_9rem]"
							>
								<div class="min-w-0">
									<a
										class="flex items-center gap-2 font-medium hover:text-primary"
										href={resolve(`/fabricacion/${orden.id}`)}
									>
										<span class="font-mono text-xs whitespace-nowrap text-base-content/50"
											>OF-{orden.id}</span
										>
										<span class="truncate">{orden.nombre_trabajo}</span>
										{#if orden.prioridad}
											<EstadoBadge class="badge-xs" estado={prioridad} />
										{/if}
									</a>
									<p class="secundario truncate">
										{orden.es_para_stock
											? 'Para stock'
											: [orden.cliente_nombre, orden.pedido?.numero].filter(Boolean).join(' · ')}
									</p>
								</div>
								<div class="hidden text-sm sm:block">
									{formatearFecha(orden.fecha_fin_estimada)}
									{#if aviso}<p class={['text-xs font-medium', aviso.clase]}>{aviso.texto}</p>{/if}
								</div>
								<div class="flex flex-col items-end gap-1">
									<EstadoBadge class="badge-sm" estado={orden.estado} />
									<div class="flex items-center gap-2">
										<progress
											class="progress w-16 progress-primary"
											value={orden.cantidad_producida}
											max={orden.cantidad_total}
										></progress>
										<span class="text-xs text-base-content/70 tabular-nums">
											{orden.cantidad_producida}/{orden.cantidad_total}
										</span>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-base-content/60">No hay órdenes en producción.</p>
				{/if}
			</Seccion>
		{/if}

		<Seccion titulo={usuario?.empleado_id ? 'Mis tareas' : 'Tareas pendientes'}>
			{#snippet acciones()}
				<a class="link text-sm link-primary" href={resolve('/tareas')}>Ver todas</a>
			{/snippet}
			{#if misTareas.length}
				<ul class="-my-2 divide-y divide-base-300">
					{#each misTareas as tarea (tarea.id)}
						{@const aviso = avisoVencimiento(tarea.fecha_entrega)}
						{@const prioridad = prioridadTarea(tarea.prioridad)}
						<li class="flex items-start gap-3 py-2.5">
							<input
								type="checkbox"
								class="checkbox mt-0.5 checkbox-sm"
								aria-label="Completar {tarea.titulo}"
								onchange={() => completar(tarea.id)}
							/>
							<div class="min-w-0 flex-1">
								<p class="flex items-center gap-2 text-sm font-medium">
									<span class={['status', `status-${prioridad.color}`]}></span>
									<span class="truncate">{tarea.titulo}</span>
								</p>
								<div class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
									{#if aviso}<span class={aviso.clase}>{aviso.texto}</span>{/if}
									{#if !usuario?.empleado_id}
										<Persona
											nombre={tarea.empleado?.nombre}
											apellido={tarea.empleado?.apellido}
											vacio="Sin asignar"
										/>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="flex items-center gap-2 text-sm text-base-content/60">
					<Icono nombre="check" class="size-4 text-success" /> No tenés tareas pendientes.
				</p>
			{/if}
		</Seccion>
	</div>
</PageLayout>
