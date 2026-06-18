<script lang="ts">
	import { crearPedido } from '$lib/remote/pedidos.remote';
	import { getClientes } from '$lib/remote/clientes.remote';
	import { getProductos } from '$lib/remote/productos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { FormActions, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Producto } from '$lib/server/db/schema';

	let form = crearPedido;
	let clientes = await getClientes({});
	let productos = await getProductos({});
	let producto: Producto | undefined = $state();

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
					label: c.nombre
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
</script>

<PageLayout>
	<!-- Header -->
	<PageHeader
		title="Nuevo Pedido"
		description="Completa el formulario para crear un nuevo pedido"
	/>

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
		<fieldset class="fieldset">
			<legend class="fieldset-legend text-lg">Información del Cliente</legend>

			<div class="space-y-4">
				<!-- Cliente -->
				<SearchSelect
					id="cliente_id"
					label="Cliente"
					options={clientesOptions}
					placeholder="Buscar cliente..."
					field={form.fields.cliente_id}
				/>

				<!-- Fecha de entrega -->
				<FormFieldWrapper label="Fecha de entrega prometida" id="fecha_entrega_prometida">
					<input class="input" {...form.fields?.fecha_entrega_prometida?.as('date')} />
				</FormFieldWrapper>

				<!-- Anticipo -->
				<FormFieldWrapper label="Anticipo (opcional)" id="anticipo">
					<input
						class="remove-arrow input"
						placeholder="0"
						{...form.fields?.anticipo?.as('number')}
					/>
				</FormFieldWrapper>
			</div>
		</fieldset>

		<!-- Productos -->
		<fieldset class="fieldset">
			<div class="flex items-center justify-between">
				<legend class="fieldset-legend text-lg">Productos</legend>
				<button type="button" onclick={agregarLinea} class="btn btn-outline btn-sm">
					+ Agregar producto
				</button>
			</div>

			<div class="space-y-3">
				{#each lineas as linea, idx (linea.idx)}
					<div class="card border border-base-300 bg-base-100 p-4">
						<button
							type="button"
							onclick={() => eliminarLinea(linea.idx)}
							class="btn absolute top-2 right-2 btn-circle btn-ghost btn-xs"
							class:hidden={lineas.length === 1}
						>
							✕
						</button>

						<div class="grid gap-4 md:grid-cols-4">
							<!-- Producto -->
							<SearchSelect
								label="Producto"
								id={`lineas[${idx}].producto_id`}
								field={form.fields.lineas[idx].producto_id}
								options={[
									{ value: 'personalizado', label: '📝 Personalizado' },
									...productos.data.map((p) => ({ value: p.id.toString(), label: p.nombre }))
								]}
								onChange={(val: string) => onProductoChange(idx, val)}
							/>

							<!-- Descripción (si es personalizado) -->
							{#if form.fields.lineas[idx].producto_id.value() === 'personalizado'}
								<FormFieldWrapper label="Descripción" id={`lineas[${idx}].descripcion`}>
									<input
										class="input"
										id={`lineas[${idx}].descripcion`}
										{...form.fields.lineas[idx].descripcion.as('text')}
									/>
								</FormFieldWrapper>
							{/if}

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
			</div>

			<!-- Total -->
			<div class="divider my-4"></div>
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
		<fieldset class="fieldset">
			<legend class="fieldset-legend text-lg">Notas</legend>

			<FormFieldWrapper label="Observaciones" id="observaciones">
				<textarea
					placeholder="Notas adicionales sobre el pedido..."
					rows={3}
					{...form.fields?.observaciones?.as('text')}
					class="textarea resize-none"
				>
				</textarea>
			</FormFieldWrapper>
		</fieldset>

		<!-- Errores -->
		{#if form?.fields?.allIssues?.()?.length}
			<div role="alert" class="alert gap-4 alert-error">
				<svg class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					{#each form?.fields?.allIssues() as issue (issue)}
						<p class="text-sm">{issue.message}</p>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<FormActions
			cancelHref="/pedidos"
			pending={!!form.pending}
			pendingText="Creando pedido..."
			submitText="Crear Pedido"
		/>
	</form>
</PageLayout>
