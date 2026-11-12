<script lang="ts">
	import { page } from '$app/state';
	import {
		EstadoBadge,
		Highlight,
		Icono,
		MenuDesplegable,
		PageLayout,
		Persona,
		Table,
		filtrar,
		parametro
	} from '$lib/ui';
	import SelectorVista from '$lib/ui/SelectorVista.svelte';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { avisoVencimiento } from '$lib/utils/fechas';
	import { getEmpleadosOpciones } from '$lib/modulos/configuracion/empleados.remote';
	import TableroTareas from '$lib/modulos/tareas/componentes/TableroTareas.svelte';
	import TareaPanel from '$lib/modulos/tareas/componentes/TareaPanel.svelte';
	import {
		archivarTarea,
		eliminarTarea,
		getTareas,
		moverTarea,
		reordenarTareas,
		type TareaListada
	} from '$lib/modulos/tareas/tareas.remote';
	import {
		ESTADOS_TAREA,
		EstadosTarea,
		PRIORIDADES_TAREA,
		estadoTarea,
		prioridadTarea
	} from '$lib/modulos/tareas/tipos';

	const archivadas = $derived(parametro('archivadas') === '1');
	const vista = $derived(archivadas ? 'lista' : parametro('vista', 'tablero'));
	const busqueda = $derived(parametro('search').toLowerCase());
	const responsable = $derived(parametro('responsable'));
	const prioridad = $derived(parametro('prioridad'));
	const miEmpleado = $derived(page.data.user?.empleado_id ?? null);

	const empleados = $derived(await getEmpleadosOpciones());
	let tareas = $derived(await getTareas(archivadas ? { archivadas: true } : {}));
	let panel: TareaPanel;

	const visibles = $derived(
		tareas.filter(
			(t) =>
				(!busqueda ||
					t.titulo.toLowerCase().includes(busqueda) ||
					t.descripcion?.toLowerCase().includes(busqueda)) &&
				(!prioridad || t.prioridad === prioridad) &&
				(!responsable ||
					(responsable === 'mias'
						? t.asignado_a === miEmpleado
						: responsable === 'sin'
							? !t.asignado_a
							: t.asignado_a === Number(responsable)))
		)
	);
	const vencidas = $derived(
		visibles.filter(
			(t) =>
				t.estado !== EstadosTarea.COMPLETADA &&
				avisoVencimiento(t.fecha_entrega)?.clase === 'text-error'
		).length
	);

	async function ejecutar(accion: () => Promise<unknown>, error: string) {
		try {
			await accion();
		} catch {
			toast.error(error);
			tareas = await getTareas(archivadas ? { archivadas: true } : {});
		}
	}

	const mover = (tarea: TareaListada, estado: EstadosTarea) => {
		tareas = tareas.map((t) => (t.id === tarea.id ? { ...t, estado } : t));
		return ejecutar(() => moverTarea({ id: tarea.id, estado }), 'No se pudo mover la tarea');
	};

	const reordenar = (orden: { id: number; orden: number }[]) => {
		const posicion = new Map(orden.map((o) => [o.id, o.orden]));
		tareas = tareas
			.map((t) => (posicion.has(t.id) ? { ...t, orden: posicion.get(t.id)! } : t))
			.toSorted((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
		return ejecutar(() => reordenarTareas(orden), 'No se pudo reordenar');
	};

	const archivar = (tarea: TareaListada, archivada: boolean) =>
		ejecutar(async () => {
			await archivarTarea({ id: tarea.id, archivada });
			toast.success(archivada ? 'Tarea archivada' : 'Tarea restaurada');
		}, 'No se pudo actualizar la tarea');

	const eliminar = (tarea: TareaListada) =>
		confirmarYEjecutar({
			mensaje: `¿Eliminar la tarea «${tarea.titulo}»? No se puede deshacer.`,
			ejecutar: () => eliminarTarea(tarea.id),
			exito: 'Tarea eliminada'
		});
</script>

{#snippet menu(tarea: TareaListada)}
	<MenuDesplegable alFinal class="btn btn-square btn-ghost btn-xs" titulo="Acciones de la tarea">
		{#snippet etiqueta()}<Icono nombre="mas" />{/snippet}
		<li><button onclick={() => panel.abrir(tarea)}>Editar</button></li>
		{#if !tarea.archivada && tarea.estado !== EstadosTarea.COMPLETADA}
			<li>
				<button onclick={() => mover(tarea, EstadosTarea.COMPLETADA)}>Marcar completada</button>
			</li>
		{/if}
		<li>
			<button onclick={() => archivar(tarea, !tarea.archivada)}>
				{tarea.archivada ? 'Restaurar' : 'Archivar'}
			</button>
		</li>
		<li><button class="text-error" onclick={() => eliminar(tarea)}>Eliminar</button></li>
	</MenuDesplegable>
{/snippet}

<PageLayout>
	<header class="encabezado-fijo flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Tareas</h1>
			<p class="text-sm text-base-content/60">
				{visibles.length}
				{archivadas ? 'archivadas' : visibles.length === 1 ? 'tarea' : 'tareas'}
				{#if vencidas}· <span class="text-error">{vencidas} vencidas</span>{/if}
			</p>
		</div>
		<button class="btn btn-primary btn-sm" onclick={() => panel.abrir()}>
			<Icono nombre="mas_simple" /> Nueva tarea
		</button>
	</header>

	<div class="flex flex-wrap items-center gap-2">
		<label class="input w-full input-sm sm:w-64">
			<Icono nombre="buscar" class="size-4 opacity-50" />
			<input
				type="search"
				placeholder="Buscar tarea..."
				value={parametro('search')}
				oninput={(e) => {
					const valor = e.currentTarget.value;
					debounce(() => filtrar({ search: valor }, { reemplazar: true }), 250);
				}}
			/>
		</label>
		<select
			class="select w-44 select-sm"
			value={responsable}
			onchange={(e) => filtrar({ responsable: e.currentTarget.value })}
		>
			<option value="">Todos</option>
			{#if miEmpleado}<option value="mias">Asignadas a mí</option>{/if}
			<option value="sin">Sin asignar</option>
			{#each empleados as empleado (empleado.id)}
				<option value={String(empleado.id)}>{empleado.nombre} {empleado.apellido ?? ''}</option>
			{/each}
		</select>
		<select
			class="select w-36 select-sm"
			value={prioridad}
			onchange={(e) => filtrar({ prioridad: e.currentTarget.value })}
		>
			<option value="">Toda prioridad</option>
			{#each PRIORIDADES_TAREA as opcion (opcion.valor)}
				<option value={opcion.valor}>{opcion.etiqueta}</option>
			{/each}
		</select>
		<div class="ml-auto flex items-center gap-2">
			<button
				class={['btn btn-ghost btn-sm', archivadas && 'btn-active']}
				onclick={() => filtrar({ archivadas: archivadas ? null : '1' })}
			>
				<Icono nombre="archivo" />
				{archivadas ? 'Volver a activas' : 'Archivadas'}
			</button>
			{#if !archivadas}
				<SelectorVista
					opciones={[
						{ valor: 'tablero', etiqueta: 'Tablero', icono: 'tablero' },
						{ valor: 'lista', etiqueta: 'Lista', icono: 'lista' }
					]}
				/>
			{/if}
		</div>
	</div>

	{#if vista === 'tablero'}
		<TableroTareas
			tareas={visibles}
			onAbrir={(tarea) => panel.abrir(tarea)}
			onMover={mover}
			onReordenar={reordenar}
			{menu}
		/>
	{:else}
		{#snippet encabezado()}
			<th>Tarea</th>
			<th>Prioridad</th>
			<th class="hidden md:table-cell">Responsable</th>
			<th>Entrega</th>
			<th>Estado</th>
			<th class="w-0"></th>
		{/snippet}
		{#snippet fila(tarea: TareaListada)}
			{@const aviso =
				tarea.estado === EstadosTarea.COMPLETADA ? null : avisoVencimiento(tarea.fecha_entrega)}
			{@const nivel = prioridadTarea(tarea.prioridad)}
			{@const estado = estadoTarea(tarea.estado)}
			<td class="max-w-md">
				<button class="enlace-fila text-left" onclick={() => panel.abrir(tarea)}>
					<Highlight text={tarea.titulo} query={busqueda} />
				</button>
				{#if tarea.descripcion}<p class="secundario truncate">{tarea.descripcion}</p>{/if}
			</td>
			<td>
				<span class="flex items-center gap-2 text-sm">
					<span class={['status', `status-${nivel.color}`]}></span>{nivel.etiqueta}
				</span>
			</td>
			<td class="hidden md:table-cell">
				<Persona nombre={tarea.empleado?.nombre} apellido={tarea.empleado?.apellido} />
			</td>
			<td class="whitespace-nowrap">
				{tarea.fecha_entrega ? new Date(tarea.fecha_entrega).toLocaleDateString('es-AR') : '-'}
				{#if aviso}<p class={['text-xs font-medium', aviso.clase]}>{aviso.texto}</p>{/if}
			</td>
			<td>
				{#if archivadas}
					<EstadoBadge class="badge-sm" estado={{ nombre: estado.etiqueta, color: estado.color }} />
				{:else}
					<select
						class="select w-36 select-xs"
						value={tarea.estado}
						aria-label="Estado de {tarea.titulo}"
						onchange={(e) => mover(tarea, e.currentTarget.value as EstadosTarea)}
					>
						{#each ESTADOS_TAREA as opcion (opcion.valor)}
							<option value={opcion.valor}>{opcion.etiqueta}</option>
						{/each}
					</select>
				{/if}
			</td>
			<td>{@render menu(tarea)}</td>
		{/snippet}
		<div class="card overflow-hidden">
			<Table
				data={visibles}
				header={encabezado}
				row={fila}
				emptyMessage={archivadas ? 'No hay tareas archivadas' : 'No hay tareas para estos filtros'}
			/>
		</div>
	{/if}
</PageLayout>

<TareaPanel bind:this={panel} {empleados} />
