<script lang="ts">
	import { crearPedido } from '$lib/remote/pedidos.remote';
	import { obtenerContactosCliente } from '$lib/remote/contactos.remote';
	import { getProductos } from '$lib/remote/productos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { Can, FormActions, FormErrors, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';
	import { redondearPrecio } from '$lib/utils/precios';

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
			precio_lista: 0,
			precio_lista_minimo: 0,
			descuento_porcentaje: 0,
			justificacion_descuento: '',
			costo_materiales: 0,
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
				precio_lista: 0,
				precio_lista_minimo: 0,
				descuento_porcentaje: 0,
				justificacion_descuento: '',
				costo_materiales: 0,
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
		producto = productos.data.find((p) => p.id.toString() === productoId);
		const esPersonalizado = productoId === 'personalizado';
		const precioLista = esPersonalizado ? 0 : (producto?.precio_venta ?? 0);
		const costo = esPersonalizado ? 0 : (producto?.costo_materiales ?? 0);
		lineas = lineas.map((linea, index) =>
			index === idx
				? {
						...linea,
						producto_id: productoId,
						precio_lista: precioLista,
						precio_lista_minimo: precioLista,
						precio: precioLista,
						costo_materiales: costo,
						descuento_porcentaje: 0,
						justificacion_descuento: ''
					}
				: linea
		);
		form.fields.lineas[idx].precio_lista.set(precioLista);
		form.fields.lineas[idx].precio.set(precioLista);
		form.fields.lineas[idx].descuento_porcentaje.set(0);
		form.fields.lineas[idx].justificacion_descuento.set('');
	}

	function actualizarPrecioLinea(
		idx: number,
		campo: 'precio_lista' | 'descuento_porcentaje' | 'justificacion_descuento',
		valor: string
	) {
		const linea = lineas[idx];
		const precio_lista =
			campo === 'precio_lista'
				? Math.max(Number(valor) || 0, Number(linea.precio_lista_minimo || 0))
				: linea.precio_lista;
		const descuento_porcentaje =
			campo === 'descuento_porcentaje'
				? Math.min(Math.max(Number(valor) || 0, 0), 99.99)
				: linea.descuento_porcentaje;
		const justificacion_descuento =
			campo === 'justificacion_descuento' ? valor : linea.justificacion_descuento;
		const precio = redondearPrecio(precio_lista * (1 - descuento_porcentaje / 100));
		lineas = lineas.map((item, index) =>
			index === idx
				? { ...item, precio_lista, descuento_porcentaje, justificacion_descuento, precio }
				: item
		);
		form.fields.lineas[idx].precio_lista.set(precio_lista);
		form.fields.lineas[idx].descuento_porcentaje.set(descuento_porcentaje);
		form.fields.lineas[idx].justificacion_descuento.set(justificacion_descuento);
		form.fields.lineas[idx].precio.set(precio);
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
				toast.error(error instanceof Error ? error.message : 'Error al crear el pedido');
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

						<div class="grid gap-4 md:grid-cols-12">
							<!-- Producto -->
							<SearchSelect
								label="Producto"
								class="md:col-span-4"
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
								class="md:col-span-3"
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

							<FormFieldWrapper label="Costo" id={`lineas[${idx}].costo`}>
								<div class="input flex items-center bg-base-200">
									${Number(linea.costo_materiales || 0).toLocaleString('es-AR', {
										minimumFractionDigits: 2
									})}
								</div>
							</FormFieldWrapper>
							{#if linea.producto_id === 'personalizado'}
								<FormFieldWrapper label="Precio de lista" id={`lineas[${idx}].precio_lista`}>
									<input
										class="remove-arrow input"
										type="number"
										min="0"
										step="0.01"
										value={linea.precio_lista}
										oninput={(event) =>
											actualizarPrecioLinea(idx, 'precio_lista', event.currentTarget.value)}
									/>
								</FormFieldWrapper>
							{:else}
								<FormFieldWrapper label="Precio de lista" id={`lineas[${idx}].precio_lista`}>
									<input
										class="remove-arrow input"
										type="number"
										min={linea.precio_lista_minimo}
										step="0.01"
										value={linea.precio_lista}
										oninput={(event) =>
											actualizarPrecioLinea(idx, 'precio_lista', event.currentTarget.value)}
									/>
								</FormFieldWrapper>
							{/if}
							<Can modulo="pedidos" accion="descuento">
								<FormFieldWrapper label="Descuento (%)" id={`lineas[${idx}].descuento_porcentaje`}>
									<input
										id={`lineas[${idx}].descuento_porcentaje`}
										class="remove-arrow input"
										type="number"
										min="0"
										max="99.99"
										step="0.01"
										value={linea.descuento_porcentaje}
										oninput={(event) =>
											actualizarPrecioLinea(idx, 'descuento_porcentaje', event.currentTarget.value)}
									/>
								</FormFieldWrapper>
								{#if linea.descuento_porcentaje > 0}
									<FormFieldWrapper
										label="Motivo del descuento"
										id={`lineas[${idx}].justificacion_descuento`}
										required
									>
										<input
											class="input"
											id={`lineas[${idx}].justificacion_descuento`}
											required
											value={linea.justificacion_descuento}
											oninput={(event) =>
												actualizarPrecioLinea(
													idx,
													'justificacion_descuento',
													event.currentTarget.value
												)}
										/>
									</FormFieldWrapper>
								{/if}
							</Can>
							<FormFieldWrapper label="Precio neto" id={`lineas[${idx}].precio`}>
								<div class="input flex items-center bg-base-200 font-semibold">
									${Number(linea.precio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
								</div>
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
