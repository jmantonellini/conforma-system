<script lang="ts">
	import { crearOrdenFabricacion, getEmpleados } from '$lib/remote/fabricacion.remote';
	import { getLineasPedidoSinOrden } from '$lib/remote/pedidos.remote';
	import { PageLayout, PageHeader, FormFieldWrapper, FormActions } from '$lib/components/ui';
	import { page } from '$app/state';

	let id = $derived(page.url.searchParams.get('linea'));

	const form = crearOrdenFabricacion;
	const lineasPendientes = await getLineasPedidoSinOrden({ limit: 100 });

	const empleados = await getEmpleados();
</script>

<PageLayout>
	<PageHeader title="Nueva Orden de Fabricación" />

	<form {...form} class="space-y-6">
		<fieldset class="fieldset rounded-box border p-4">
			<legend class="fieldset-legend">Datos de la orden</legend>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper id="linea_pedido_id" label="Línea de pedido" required>
					<select {...form.fields.linea_pedido_id.as('select', String(id))} class="select">
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

				<FormFieldWrapper id="cantidad_total" label="Cantidad total" required>
					<input class="remove-arrow input" {...form.fields.cantidad_total.as('number')} />
				</FormFieldWrapper>

				<FormFieldWrapper id="prioridad" label="Prioridad">
					<select {...form.fields.prioridad.as('select')} class="select">
						<option value="0">Normal</option>
						<option value="1">Urgente</option>
						<option value="2">Crítica</option>
					</select>
				</FormFieldWrapper>

				<FormFieldWrapper id="fecha_fin_estimada" label="Fecha estimada de finalización">
					<input class="input" {...form.fields.fecha_fin_estimada.as('date')} />
				</FormFieldWrapper>

				<FormFieldWrapper id="asignado_a" label="Asignar a">
					<select {...form.fields.asignado_a.as('select')} class="select">
						<option value={0}>Sin asignar</option>
						{#each empleados as emp (emp.id)}
							<option value={emp.id}>{emp.nombre} {emp.apellido}</option>
						{/each}
					</select>
				</FormFieldWrapper>
			</div>

			<FormFieldWrapper id="observaciones" label="Observaciones">
				<textarea class="textarea" rows="3" {...form.fields.observaciones.as('text')}></textarea>
			</FormFieldWrapper>
		</fieldset>

		<FormActions cancelHref="/fabricacion" pending={!!form.pending} submitText="Crear Orden" />
	</form>
</PageLayout>
