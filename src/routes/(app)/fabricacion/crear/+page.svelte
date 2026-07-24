<script lang="ts">
	import { page } from '$app/state';
	import { crearOrdenFabricacion } from '$lib/remote/fabricacion.remote';
	import { getEmpleados } from '$lib/remote/empleados.remote';
	import { getLineasPedidoSinOrden } from '$lib/remote/pedidos.remote';
	import { PageLayout, FormFieldWrapper, FormActions } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	
	const form = crearOrdenFabricacion;
	const empleados = $derived(await getEmpleados());
	const lineasPendientes = $derived(await getLineasPedidoSinOrden({ limit: 100 }));
	console.log('LINEAS', lineasPendientes);
	
	let id = $derived(page.url.searchParams.get('linea') ?? '');
</script>

<PageLayout>
	<form
		{...form.enhance(async (form) => {
			try {
				if (await form.submit()) {
					form.element.reset();
					goto(resolve('/fabricacion'));
					toast.success('Orden creada!');
				} else {
					toast.error('Error de validación');
				}
			} catch (error) {
				console.log(error);
				toast.error('Error del servidor');
			}
		})}
		class="space-y-6"
	>
		<fieldset
			class="fieldset gap-4 rounded-box border border-base-300 bg-base-200 p-4 md:grid-cols-3"
		>
			<legend class="fieldset-legend text-lg">Datos de la orden</legend>
			<FormFieldWrapper id="linea_pedido_id" label="Línea de pedido" required>
				<select {...form.fields.linea_pedido_id.as('select', id)} class="select">
					<button>
						<selectedcontent></selectedcontent>
					</button>
					<option value="">Seleccionar...</option>
					{#each lineasPendientes as lp (lp.id)}
						<option value={String(lp.id)}>
							{lp.pedido_numero} - {lp.producto_nombre || lp.descripcion || 'Personalizado'} ({lp.cantidad}u)
						</option>
					{/each}
				</select>
			</FormFieldWrapper>

			<FormFieldWrapper id="nombre_trabajo" label="Nombre del trabajo" required>
				<input class="input" {...form.fields.nombre_trabajo.as('text')} />
			</FormFieldWrapper>

			<FormFieldWrapper id="asignado_a" label="Asignar a">
				<select {...form.fields.asignado_a.as('select')} class="select">
					<option value="-1">Sin asignar</option>
					{#each empleados as emp (emp.id)}
						<option value={String(emp.id)}>{emp.nombre} {emp.apellido}</option>
					{/each}
				</select>
			</FormFieldWrapper>

			<FormFieldWrapper id="cantidad_total" label="Cantidad total" required>
				<input class="remove-arrow input" {...form.fields.cantidad_total.as('number')} />
			</FormFieldWrapper>

			<FormFieldWrapper id="prioridad" label="Prioridad">
				<select {...form.fields.prioridad.as('select', '0')} class="select">
					<option value="0">Normal</option>
					<option value="1">Urgente</option>
					<option value="2">Crítica</option>
				</select>
			</FormFieldWrapper>

			<FormFieldWrapper id="fecha_fin_estimada" label="Fecha estimada de finalización">
				<input class="input" {...form.fields.fecha_fin_estimada.as('date')} />
			</FormFieldWrapper>

			<FormFieldWrapper id="observaciones" label="Observaciones">
				<textarea class="textarea" rows="3" {...form.fields.observaciones.as('text')}></textarea>
			</FormFieldWrapper>
		</fieldset>

		<FormActions cancelHref="/fabricacion" pending={!!form.pending} submitText="Crear Orden" />
		{#if form.fields.allIssues?.()?.length}
			<div class="space-y-1">
				{#each form.fields.allIssues?.() as issue (issue)}
					<p class="text-sm text-error">{issue.message}</p>
				{/each}
			</div>
		{/if}
	</form>
</PageLayout>
