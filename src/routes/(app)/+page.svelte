<script lang="ts">
	import {
		getTareas,
		crearTarea,
		actualizarEstadoTarea,
		actualizarTarea,
		archivarTarea,
		eliminarTarea,
		reordenarTareas
	} from '$lib/remote/tareas.remote';
	import { getEmpleados } from '$lib/remote/empleados.remote';
	import {
		FormErrors,
		PageLayout,
		Modal,
		FormFieldWrapper,
		KanBanBoard,
		Table
	} from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import type { EstadosTarea } from '$lib/types';
	import { resolve } from '$app/paths';
	import { estaVencido, formatearFecha } from '$lib/utils/fechas';
	import { getOrdenesFabricacion } from '$lib/remote/fabricacion-consultas.remote';

	let tareas = $derived(await getTareas());
	let empleados = $derived(await getEmpleados());
	let { ordenes: ordenesActivas } = $derived(await getOrdenesFabricacion({ soloActivas: true }));
	let showModal = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let tareaEditandoId = $state<number | null>(null);
	let tareaForm = $state({
		titulo: '',
		descripcion: '',
		fecha_entrega: '',
		asignado_a: ''
	});
	const form = crearTarea;

	function formatearFechaInput(value: Date | string | null | undefined) {
		if (!value) return '';
		const fecha = new Date(value);
		if (Number.isNaN(fecha.getTime())) return '';
		const offset = fecha.getTimezoneOffset();
		return new Date(fecha.getTime() - offset * 60000).toISOString().slice(0, 10);
	}

	function resetTareaForm() {
		tareaForm = {
			titulo: '',
			descripcion: '',
			fecha_entrega: '',
			asignado_a: ''
		};
	}

	function abrirNuevaTarea() {
		modalMode = 'create';
		tareaEditandoId = null;
		resetTareaForm();
		showModal = true;
	}

	function abrirEditarTarea(tarea: (typeof tareas)[number]) {
		modalMode = 'edit';
		tareaEditandoId = tarea.id;
		tareaForm = {
			titulo: tarea.titulo,
			descripcion: tarea.descripcion ?? '',
			fecha_entrega: formatearFechaInput(tarea.fecha_entrega),
			asignado_a: tarea.asignado_a ? String(tarea.asignado_a) : ''
		};
		showModal = true;
	}

	async function handleEstadoChange(id: number, nuevoEstado: EstadosTarea) {
		tareas = tareas.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t));
		await actualizarEstadoTarea({ id: String(id), estado: nuevoEstado });
	}

	async function handleReorder(updates: { id: number; orden: number }[]) {
		tareas = tareas.map((t) => {
			const update = updates.find((u) => u.id === t.id);
			return update ? { ...t, orden: update.orden } : t;
		});
		await reordenarTareas({ tareas: updates });
	}

	async function handleEliminar(id: number) {
		if (confirm('¿Eliminar esta tarea?')) {
			tareas = tareas.filter((t) => t.id !== id);
			await eliminarTarea(String(id));
			toast.success('Tarea eliminada');
		}
	}

	async function handleArchivar(id: number) {
		if (confirm('¿Archivar esta tarea?')) {
			tareas = tareas.filter((t) => t.id !== id);
			await archivarTarea({ id: String(id), archivada: true });
			toast.success('Tarea archivada');
		}
	}

	async function handleGuardarEdicion(event: SubmitEvent) {
		event.preventDefault();
		if (tareaEditandoId === null) return;
		if (!tareaForm.titulo.trim()) {
			toast.error('El título es requerido');
			return;
		}

		await actualizarTarea({
			id: String(tareaEditandoId),
			titulo: tareaForm.titulo.trim(),
			descripcion: tareaForm.descripcion.trim() || undefined,
			fecha_entrega: tareaForm.fecha_entrega || undefined,
			asignado_a: tareaForm.asignado_a || undefined
		});
		tareas = await getTareas();
		showModal = false;
		resetTareaForm();
		tareaEditandoId = null;
		toast.success('Tarea actualizada');
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-end">
			<button class="btn btn-primary btn-sm" onclick={abrirNuevaTarea}> + Nueva Tarea </button>
		</div>

		<!-- KANBAN: Tareas accionables -->
		<KanBanBoard
			{tareas}
			onEstadoChange={handleEstadoChange}
			onReorder={handleReorder}
			onEliminar={handleEliminar}
			onEditar={abrirEditarTarea}
			onArchivar={handleArchivar}
		/>

		<!-- PEDIDOS ACTIVOS: Contexto de negocio -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="card-title">Órdenes activas</h2>
					<span class="text-sm text-base-content/60">
						{ordenesActivas.length} orden{ordenesActivas.length === 1 ? '' : 'es'} en curso
					</span>
				</div>

				{#snippet headerOrdenes()}
					<th>Prioridad</th>
					<th>Estado</th>
					<th>Trabajo</th>
					<th>Cliente</th>
					<th>Asignado</th>
					<th>Entrega</th>
					<th>Progreso</th>
				{/snippet}

				{#snippet rowOrden(o: (typeof ordenesActivas)[number])}
					<td>
						{#if o.prioridad === 2}
							<span class="badge badge-error">Crítica</span>
						{:else if o.prioridad === 1}
							<span class="badge badge-warning">Urgente</span>
						{:else}
							<span class="badge badge-ghost">Normal</span>
						{/if}
					</td>
					<td>
						<span class={`badge badge-${o.estado.color}`}>
							{o.estado.nombre}
						</span>
					</td>
					<td>
						<a class="link link-primary" href={resolve(`/fabricacion/${o.id}`)}>
							{o.nombre_trabajo}
						</a>
						<div class="text-xs text-base-content/50">Pedido {o.pedido?.numero || '-'}</div>
					</td>
					<td>{o.cliente_nombre || '-'}</td>
					<td
						>{o.empleado?.nombre
							? `${o.empleado.nombre} ${o.empleado.apellido || ''}`
							: 'Sin asignar'}</td
					>
					<td>
						{#if o.fecha_fin_estimada}
							{@const vencido = estaVencido(o.fecha_fin_estimada)}
							<span class:text-error={vencido} class:font-bold={vencido}>
								{formatearFecha(new Date(o.fecha_fin_estimada))}
							</span>
						{:else}
							-
						{/if}
					</td>
					<td>
						<progress class="progress w-20" value={o.cantidad_producida} max={o.cantidad_total}
						></progress>
						<span class="ml-2 text-xs">{o.cantidad_producida}/{o.cantidad_total}</span>
					</td>
				{/snippet}

				<Table
					data={ordenesActivas}
					header={headerOrdenes}
					row={rowOrden}
					emptyMessage="No hay órdenes activas"
				/>
			</div>
		</div>
	</div>
</PageLayout>

<Modal
	bind:open={showModal}
	title={modalMode === 'create' ? 'Nueva Tarea' : 'Editar Tarea'}
	onClose={() => {
		showModal = false;
		if (modalMode === 'edit') {
			resetTareaForm();
			tareaEditandoId = null;
		}
	}}
>
	{#if modalMode === 'create'}
		<form
			{...form.enhance(async (formInstance) => {
				try {
					if (await formInstance.submit()) {
						toast.success('Tarea creada');
						tareas = await getTareas();
						showModal = false;
						formInstance.element.reset();
					} else {
						toast.error('Error de validación');
					}
				} catch (error) {
					console.log(error);

					toast.error('Error del servidor');
				}
			})}
			id="tarea-form"
		>
			<div class="space-y-4">
				<FormFieldWrapper id="titulo" label="Título" required>
					<input class="input w-full" {...form.fields.titulo.as('text')} />
				</FormFieldWrapper>

				<FormFieldWrapper id="descripcion" label="Descripción">
					<textarea class="textarea w-full resize-none" rows="3" {...form.fields.descripcion.as('text')}>
					</textarea>
				</FormFieldWrapper>

				<div class="grid grid-cols-2 gap-4">
					<FormFieldWrapper id="fecha_entrega" label="Fecha de entrega">
						<input class="input w-full" {...form.fields.fecha_entrega.as('date')} />
					</FormFieldWrapper>

					<FormFieldWrapper id="asignado_a" label="Asignar a">
						<select class="select w-full" {...form.fields.asignado_a.as('select')}>
							<option value="">Sin asignar</option>
							{#each empleados as emp (emp.id)}
								<option value={String(emp.id)}>{emp.nombre} {emp.apellido}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				</div>
			</div>
			<FormErrors {form} />
		</form>
	{:else}
		<form id="editar-tarea-form" onsubmit={handleGuardarEdicion}>
			<div class="space-y-4">
				<FormFieldWrapper id="titulo-editar" label="Título" required>
					<input
						class="input w-full"
						bind:value={tareaForm.titulo}
						placeholder="Título de la tarea"
					/>
				</FormFieldWrapper>

				<FormFieldWrapper id="descripcion-editar" label="Descripción">
					<textarea class="textarea w-full" rows="3" bind:value={tareaForm.descripcion}></textarea>
				</FormFieldWrapper>

				<div class="grid grid-cols-2 gap-4">
					<FormFieldWrapper id="fecha-entrega-editar" label="Fecha de entrega">
						<input class="input w-full" type="date" bind:value={tareaForm.fecha_entrega} />
					</FormFieldWrapper>

					<FormFieldWrapper id="asignado-editar" label="Asignar a">
						<select class="select w-full" bind:value={tareaForm.asignado_a}>
							<option value="">Sin asignar</option>
							{#each empleados as emp (emp.id)}
								<option value={String(emp.id)}>{emp.nombre} {emp.apellido}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				</div>
			</div>
		</form>
	{/if}

	{#snippet actions()}
		<button class="btn" onclick={() => (showModal = false)}>Cancelar</button>
		{#if modalMode === 'create'}
			<button type="submit" class="btn btn-primary" form="tarea-form" disabled={!!form.pending}>
				{form.pending ? 'Creando...' : 'Crear'}
			</button>
		{:else}
			<button type="submit" class="btn btn-primary" form="editar-tarea-form">Guardar</button>
		{/if}
	{/snippet}
</Modal>
