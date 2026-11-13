<script lang="ts">
	import { FormErrors, FormFieldWrapper, Modal } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { formatearFecha } from '$lib/utils/fechas';
	import { guardarTarea, type TareaListada } from '../tareas.remote';
	import { ESTADOS_TAREA, EstadosTarea, PRIORIDADES_TAREA, Prioridades } from '../tipos';

	type Empleado = { id: number; nombre: string; apellido: string | null };

	let { empleados }: { empleados: Empleado[] } = $props();

	let abierto = $state(false);
	let tarea = $state<TareaListada | null>(null);
	let clave = $state(0);

	const form = $derived(guardarTarea.for(tarea ? String(tarea.id) : `nueva-${clave}`));
	const prioridadElegida = $derived(
		form.fields.prioridad.value() ?? tarea?.prioridad ?? Prioridades.MEDIA
	);
	const idForm = $derived(`tarea-${tarea?.id ?? 'nueva'}`);

	export function abrir(seleccionada: TareaListada | null = null) {
		tarea = seleccionada;
		if (!seleccionada) clave++;
		abierto = true;
	}

	const fechaInput = (fecha: Date | null) =>
		fecha ? new Date(fecha).toISOString().slice(0, 10) : '';
</script>

<Modal
	bind:open={abierto}
	lateral
	titulo={tarea ? 'Editar tarea' : 'Nueva tarea'}
	descripcion={tarea?.creada_por
		? `Creada por ${tarea.creada_por} el ${formatearFecha(tarea.created_at)}`
		: undefined}
	accion={{
		etiqueta: tarea ? 'Guardar cambios' : 'Crear tarea',
		form: idForm,
		pendiente: !!form.pending
	}}
>
	{#key idForm}
		<form
			id={idForm}
			{...form.enhance(async (instancia) => {
				try {
					if (!(await instancia.submit())) return toast.error('Revisá los datos de la tarea');
					toast.success(tarea ? 'Tarea actualizada' : 'Tarea creada');
					abierto = false;
				} catch {
					toast.error('No se pudo guardar la tarea');
				}
			})}
		>
			<input type="hidden" name="id" value={tarea?.id ?? ''} />
			<FormFieldWrapper id="tarea-titulo" label="Título" required>
				<input
					id="tarea-titulo"
					class="input"
					{...form.fields.titulo.as('text', tarea?.titulo ?? '')}
				/>
			</FormFieldWrapper>

			<FormFieldWrapper id="tarea-descripcion" label="Descripción">
				<textarea
					id="tarea-descripcion"
					class="textarea"
					rows="4"
					{...form.fields.descripcion.as('text', tarea?.descripcion ?? '')}></textarea>
			</FormFieldWrapper>

			<div class="campo">
				<span class="text-sm font-medium text-base-content/80">Prioridad</span>
				<div class="flex gap-2">
					{#each PRIORIDADES_TAREA as prioridad (prioridad.valor)}
						<input
							class="btn rounded-full btn-sm"
							aria-label={prioridad.etiqueta}
							{...form.fields.prioridad.as('radio', prioridad.valor)}
							checked={prioridadElegida === prioridad.valor}
						/>
					{/each}
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<FormFieldWrapper id="tarea-entrega" label="Fecha de entrega">
					<input
						id="tarea-entrega"
						class="input"
						{...form.fields.fecha_entrega.as('date', fechaInput(tarea?.fecha_entrega ?? null))}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="tarea-estado" label="Estado">
					<select
						id="tarea-estado"
						class="select"
						{...form.fields.estado.as('select', tarea?.estado ?? EstadosTarea.PENDIENTE)}
					>
						{#each ESTADOS_TAREA as estado (estado.valor)}
							<option value={estado.valor}>{estado.etiqueta}</option>
						{/each}
					</select>
				</FormFieldWrapper>
			</div>

			<FormFieldWrapper id="tarea-asignado" label="Responsable">
				<select
					id="tarea-asignado"
					class="select"
					{...form.fields.asignado_a.as(
						'select',
						tarea?.asignado_a ? String(tarea.asignado_a) : ''
					)}
				>
					<option value="">Sin asignar</option>
					{#each empleados as empleado (empleado.id)}
						<option value={String(empleado.id)}>{empleado.nombre} {empleado.apellido ?? ''}</option>
					{/each}
				</select>
			</FormFieldWrapper>

			{#if tarea?.completada_at}
				<p class="text-xs text-base-content/60">
					Completada el {formatearFecha(tarea.completada_at)}
				</p>
			{/if}
			<FormErrors {form} />
		</form>
	{/key}
</Modal>
