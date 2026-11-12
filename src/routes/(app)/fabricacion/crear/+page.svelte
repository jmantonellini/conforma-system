<script lang="ts">
	import { page } from '$app/state';
	import { crearOrdenFabricacion } from '$lib/modulos/fabricacion/fabricacion.remote';
	import { getEmpleadosOpciones } from '$lib/modulos/configuracion/empleados.remote';
	import { getProductos } from '$lib/modulos/productos/productos.remote';
	import { getLineasPedidoSinOrden } from '$lib/modulos/pedidos/pedidos.remote';
	import { PageLayout, FormErrors, FormFieldWrapper, FormActions } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const origenStock = $derived(page.url.searchParams.get('origen') === 'stock');
	const form = $derived(crearOrdenFabricacion.for(origenStock ? 'stock' : 'pedido'));
	const empleados = $derived(await getEmpleadosOpciones());
	const lineasPendientes = $derived(await getLineasPedidoSinOrden({ limit: 100 }));
	const productos = $derived(await getProductos({ limit: 100 }));

	const lineaId = $derived(page.url.searchParams.get('linea') ?? '');
	const lineaSeleccionada = $derived(
		lineaId ? lineasPendientes.find((lp) => String(lp.id) === lineaId) : undefined
	);
	const bloqueado = $derived(!!lineaId && !!lineaSeleccionada);
</script>

<PageLayout>
	<form
		{...form.enhance(async (form) => {
			try {
				if (await form.submit()) {
					form.element.reset();
					goto(resolve(origenStock ? '/stock' : '/fabricacion'));
					toast.success('Orden creada!');
				}
			} catch (error) {
				console.log(error);
				toast.error('Error del servidor');
			}
		})}
		class="space-y-6"
	>
		<div class="card">
			<div class="card-body">
				<h3 class="card-title">Datos de la orden</h3>
				<div class="grid gap-4 lg:grid-cols-3">
					<input {...form.fields.origen.as('hidden', origenStock ? 'stock' : 'pedido')} />
					{#if origenStock}
						<FormFieldWrapper id="producto_id" label="Producto para stock" required>
							<select
								{...form.fields.producto_id.as('select')}
								class="select"
								required
								onchange={(event) => {
									const producto = productos.data.find(
										(item) => String(item.id) === event.currentTarget.value
									);
									form.fields.nombre_trabajo.set(producto?.nombre ?? '');
								}}
							>
								<option value="">Seleccionar...</option>
								{#each productos.data as producto (producto.id)}
									<option value={String(producto.id)}>{producto.codigo} — {producto.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
					{:else}
						<FormFieldWrapper id="linea_pedido_id" label="Línea de pedido" required>
							{#if bloqueado}
								<input {...form.fields.linea_pedido_id.as('hidden', lineaId)} />
								<input
									type="text"
									class="input bg-base-300"
									value="{lineaSeleccionada?.pedido_numero} — {lineaSeleccionada?.producto_nombre ||
										lineaSeleccionada?.descripcion ||
										'Personalizado'} ({lineaSeleccionada?.cantidad}u)"
									disabled
								/>
							{:else}
								<select {...form.fields.linea_pedido_id.as('select')} class="select" required>
									<option value="">Seleccionar...</option>
									{#each lineasPendientes as lp (lp.id)}
										<option value={String(lp.id)}>
											{lp.pedido_numero} — {lp.producto_nombre || lp.descripcion || 'Personalizado'} ({lp.cantidad}u)
										</option>
									{/each}
								</select>
							{/if}
						</FormFieldWrapper>
					{/if}

					<FormFieldWrapper id="nombre_trabajo" label="Nombre del trabajo" required>
						<input
							class="input"
							{...form.fields.nombre_trabajo.as('text')}
							value={bloqueado
								? lineaSeleccionada?.producto_nombre || lineaSeleccionada?.descripcion || ''
								: undefined}
						/>
					</FormFieldWrapper>

					<FormFieldWrapper id="asignado_a" label="Asignar a">
						<select {...form.fields.asignado_a.as('select')} class="select">
							<option value="">Sin asignar</option>
							{#each empleados as emp (emp.id)}
								<option value={String(emp.id)}>{emp.nombre} {emp.apellido}</option>
							{/each}
						</select>
					</FormFieldWrapper>

					<FormFieldWrapper id="cantidad_total" label="Cantidad total" required>
						<input
							class="input {bloqueado ? 'bg-base-300' : ''}"
							{...form.fields.cantidad_total.as('number')}
							value={bloqueado ? lineaSeleccionada?.cantidad : ''}
							readonly={bloqueado}
							title={bloqueado ? 'Cantidad fijada por el pedido' : ''}
						/>
					</FormFieldWrapper>

					<FormFieldWrapper id="prioridad" label="Prioridad">
						<select {...form.fields.prioridad.as('select', '0')} class="select">
							<option value="0">Normal</option>
							<option value="1">Urgente</option>
							<option value="2">Crítica</option>
						</select>
					</FormFieldWrapper>

					<FormFieldWrapper id="fecha_fin_estimada" label="Fecha estimada de finalización">
						<input
							class="input"
							{...form.fields.fecha_fin_estimada.as('date')}
							min={new Date().toISOString().split('T')[0]}
						/>
					</FormFieldWrapper>

					<FormFieldWrapper class="lg:col-span-3" id="observaciones" label="Observaciones">
						<textarea
							class="textarea w-full resize-none"
							rows="3"
							{...form.fields.observaciones.as('text')}
						></textarea>
					</FormFieldWrapper>
				</div>
			</div>
		</div>

		<FormErrors {form} />
		<FormActions
			cancelHref={origenStock ? resolve('/stock') : resolve('/fabricacion')}
			pending={!!form.pending}
			submitText="Crear Orden"
		/>
	</form>
</PageLayout>
