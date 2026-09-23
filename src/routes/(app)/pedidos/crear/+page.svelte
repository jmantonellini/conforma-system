<script lang="ts">
	import { crearPedido } from '$lib/remote/pedidos.remote';
	import { obtenerContactosCliente } from '$lib/remote/contactos.remote';
	import { getProductos } from '$lib/remote/productos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { FormActions, FormErrors, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';

	let form = crearPedido;
	let clientes = await obtenerContactosCliente({});
	let productos = await getProductos({});
	let producto: (typeof productos.data)[number] | undefined = $state();
	let usarCreditoDistribuidor = $state(false);
	let clienteSeleccionadoId = $state('');
	let distribuidorSeleccionadoId = $state('');
	let porcentajeComisionDistribuidor = $state(0);

	let lineas = $state([
		{
			idx: 0,
			producto_id: '',
			cantidad: 1,
			precio: 0,
			descripcion: ''
		}
	]);

	let total = $derived(
		form.fields.lineas
			?.value()
			?.reduce((sum: number, l: any) => sum + (l.cantidad || 0) * (l.precio || 0), 0) ?? 0
	);
	// Opciones para el SearchSelect
	const clientesOptions =
		clientes.data.length > 0
			? clientes.data.map((c) => ({
					value: c.id.toString(),
					label: [c.nombre, c.apellido].filter(Boolean).join(' ') || c.razon_social
				}))
			: [];
	const distribuidoresOptions =
		clientes.data.filter((c) => c.es_distribuidor).length > 0
			? clientes.data
					.filter((c) => c.es_distribuidor)
					.map((c) => ({
						value: c.id.toString(),
						label: `${[c.nombre, c.apellido].filter(Boolean).join(' ') || c.razon_social} (distribuidor)`
					}))
			: [];

	function agregarLinea() {
		lineas = [
			...lineas,
			{
				idx: lineas.length,
				producto_id: '',
				cantidad: 1,
				precio: 0,
				descripcion: ''
			}
		];
	}

	function eliminarLinea(idxAEliminar: number) {
		if (lineas.length > 1) {
			lineas = lineas.filter((l) => l.idx !== idxAEliminar);
			lineas = lineas.map((l, i) => ({ ...l, id: i }));
		}
	}

	function onProductoChange(idx: number, productoId: string) {
		if (productoId && productoId !== 'personalizado') {
			producto = productos.data.find((p) => p.id.toString() === productoId);
			if (producto) {
				const precio = producto.precio_base ?? 0;

				form.fields.lineas[idx].precio.set(precio);
				lineas[idx].precio = precio;
			}
		}
	}

	let clienteSeleccionado = $derived(
		clientes.data.find((cliente) => cliente.id.toString() === clienteSeleccionadoId)
	);
	let distribuidorSeleccionado = $derived(
		clientes.data.find((cliente) => cliente.id.toString() === distribuidorSeleccionadoId)
	);
	let montoComisionDistribuidor = $derived(
		Number((total * (porcentajeComisionDistribuidor / 100)).toFixed(2))
	);
	let saldoLuegoDeEntrega = $derived(
		Number(
			(Number(distribuidorSeleccionado?.saldo_disponible ?? 0) - montoComisionDistribuidor).toFixed(
				2
			)
		)
	);

	function onDistribuidorChange(value: string) {
		distribuidorSeleccionadoId = value;
		const distribuidor = clientes.data.find((cliente) => cliente.id.toString() === value);
		porcentajeComisionDistribuidor = distribuidor?.porcentaje_compensacion ?? 0;
		form.fields.porcentaje_comision_distribuidor.set(porcentajeComisionDistribuidor);
	}
</script>

<PageLayout>
	<!-- Form -->
	<form
		{...form.enhance(async (form) => {
			try {
				if (await form.submit()) {
					form.element.reset();

					toast.success('Pedido creado!');
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
		<!-- Datos del Cliente -->
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Información del Cliente</legend>

			<div class="grid gap-4 md:grid-cols-4">
				<!-- Cliente -->
				<SearchSelect
					id="contacto_id"
					label="Cliente"
					options={clientesOptions}
					placeholder="Buscar cliente..."
					field={form.fields.contacto_id}
					onChange={(value) => (clienteSeleccionadoId = value)}
				/>
				{#if clienteSeleccionado}
					<p class="self-end text-sm text-base-content/70">
						Contacto: {[clienteSeleccionado.nombre, clienteSeleccionado.apellido]
							.filter(Boolean)
							.join(' ') || 'Sin nombre cargado'}
					</p>
				{/if}

				<!-- Distribuidor -->
				<SearchSelect
					id="contacto_distribuidor_id"
					label="Distribuidor (opcional)"
					options={distribuidoresOptions}
					placeholder="Buscar distribuidor..."
					field={form.fields.contacto_distribuidor_id}
					onChange={onDistribuidorChange}
				/>
				{#if distribuidorSeleccionado}
					<p class="self-end text-sm text-base-content/70">
						Saldo disponible: ${Number(
							distribuidorSeleccionado.saldo_disponible ?? 0
						).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
					</p>
				{/if}
				{#if distribuidorSeleccionado}
					<FormFieldWrapper
						label="Comisión del distribuidor (%)"
						id="porcentaje_comision_distribuidor"
					>
						<input
							class="remove-arrow input"
							min="0"
							max="100"
							step="0.01"
							{...form.fields?.porcentaje_comision_distribuidor?.as(
								'number',
								porcentajeComisionDistribuidor
							)}
						/>
						<p class="mt-1 text-xs text-base-content/70">
							Se descontarán ${montoComisionDistribuidor.toLocaleString('es-AR', {
								minimumFractionDigits: 2
							})} al entregar. Saldo posterior: ${saldoLuegoDeEntrega.toLocaleString('es-AR', {
								minimumFractionDigits: 2
							})}
						</p>
						{#if saldoLuegoDeEntrega < 0}
							<p class="mt-1 text-xs text-error">El saldo no alcanza para cubrir la comisión.</p>
						{/if}
					</FormFieldWrapper>
				{/if}

				<!-- Fecha de entrega -->
				<FormFieldWrapper label="Fecha de entrega prometida" id="fecha_entrega_prometida">
					<input
						class="input"
						{...form.fields?.fecha_entrega_prometida?.as('date')}
						min={new Date().toISOString().split('T')[0]}
					/>
				</FormFieldWrapper>

				<!-- Anticipo -->
				<FormFieldWrapper label="Anticipo (opcional)" id="anticipo">
					<input
						class="remove-arrow input"
						placeholder="0"
						min="0"
						{...form.fields?.anticipo?.as('number')}
					/>
				</FormFieldWrapper>

				<!-- Uso de saldo del distribuidor -->
				<FormFieldWrapper label="Usar saldo del distribuidor" id="usar_credito_distribuidor">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							class="checkbox"
							checked={usarCreditoDistribuidor}
							onchange={(e) =>
								(usarCreditoDistribuidor = (e.currentTarget as HTMLInputElement).checked)}
						/>
						<span class="text-sm">Usar crédito/saldo</span>
					</label>
				</FormFieldWrapper>
			</div>

			{#if usarCreditoDistribuidor}
				<div class="mt-4 max-w-md">
					<FormFieldWrapper label="Monto a usar del distribuidor" id="monto_credito_distribuidor">
						<input
							class="remove-arrow input"
							placeholder="0.00"
							min="0"
							step="0.01"
							{...form.fields?.monto_credito_distribuidor?.as('number')}
						/>
					</FormFieldWrapper>
				</div>
			{/if}
		</fieldset>

		<!-- Productos -->
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Productos</legend>

			<div class="space-y-3">
				{#each lineas as linea, idx (linea.idx)}
					<div class="relative border-b border-base-300 py-4 first:pt-0 last:border-b-0">
						<button
							type="button"
							onclick={() => eliminarLinea(linea.idx)}
							class="btn absolute top-1 right-1 btn-circle btn-ghost btn-xs"
							class:hidden={lineas.length === 1}
						>
							✕
						</button>

						<div class="grid gap-4 md:grid-cols-8">
							<!-- Producto -->
							<SearchSelect
								label="Producto"
								class="col-span-3"
								id={`lineas[${idx}].producto_id`}
								field={form.fields.lineas[idx].producto_id}
								options={[
									{ value: 'personalizado', label: '📝 Personalizado' },
									...productos.data.map((p) => ({ value: p.id.toString(), label: p.nombre }))
								]}
								onChange={(val: string) => onProductoChange(idx, val)}
							/>

							<!-- Descripción (si es personalizado) -->
							<FormFieldWrapper
								label="Descripción"
								id={`lineas[${idx}].descripcion`}
								class="col-span-3"
							>
								<input
									class="input"
									id={`lineas[${idx}].descripcion`}
									{...form.fields.lineas[idx].descripcion.as('text')}
								/>
							</FormFieldWrapper>

							<!-- Cantidad -->
							<FormFieldWrapper label="Cantidad" id={`lineas[${idx}].cantidad`}>
								<input
									class="remove-arrow input"
									id={`lineas[${idx}].cantidad`}
									{...form.fields.lineas[idx].cantidad.as('number')}
									min="1"
								/>
							</FormFieldWrapper>

							<!-- Precio -->
							<FormFieldWrapper label="Precio unitario" id={`lineas[${idx}].precio`}>
								<input
									class="remove-arrow input"
									{...form.fields.lineas[idx].precio.as('number')}
									step="0.01"
									min="0"
								/>
							</FormFieldWrapper>
						</div>
					</div>
				{/each}
				<div class="flex w-full items-center justify-end">
					<button type="button" onclick={agregarLinea} class="btn btn-outline btn-sm">
						+ Agregar producto
					</button>
				</div>
			</div>

			<!-- Total -->
			<div class="divider"></div>
			<div class="flex justify-end">
				<div class="text-right">
					<p class="text-sm text-base-content/70">Total</p>
					<p class="text-3xl font-bold">
						${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
					</p>
				</div>
			</div>
		</fieldset>

		<!-- Observaciones -->
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Observaciones</legend>

			<FormFieldWrapper label="Observaciones" id="observaciones">
				<textarea
					placeholder="Notas adicionales sobre el pedido..."
					rows={3}
					{...form.fields?.observaciones?.as('text')}
					class="textarea w-full resize-none"
				>
				</textarea>
			</FormFieldWrapper>
		</fieldset>

		<FormErrors {form} />

		<!-- Actions -->
		<FormActions
			cancelHref={Paths.PEDIDOS}
			pending={!!form.pending}
			pendingText="Creando pedido..."
			submitText="Crear Pedido"
		/>
	</form>
</PageLayout>
