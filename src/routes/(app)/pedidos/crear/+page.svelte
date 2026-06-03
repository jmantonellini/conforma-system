<!-- src/routes/pedidos/crear/+page.svelte -->
<script lang="ts">
	import { crearPedido } from '$lib/remote/pedidos.remote';
	import { getClientes } from '$lib/remote/clientes.remote';
	import { getProductos } from '$lib/remote/productos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import { FormActions, PageLayout } from '$lib/components/ui';

	const clientes = await getClientes({});
	const productos = await getProductos();
	const form = crearPedido;

	// Estado local del formulario
	let clienteSeleccionado = $state('');
	let lineas = $state([
		{
			id: crypto.randomUUID(),
			producto_id: '',
			cantidad: 1,
			precio: 0,
			descripcion: ''
		}
	]);

	// Opciones para el SearchSelect
	const clientesOptions =
		clientes.data.length > 0
			? clientes.data.map((c) => ({
					value: c.id.toString(),
					label: c.nombre
				}))
			: [];

	function agregarLinea() {
		lineas.push({
			id: crypto.randomUUID(),
			producto_id: '',
			cantidad: 1,
			precio: 0,
			descripcion: ''
		});
		lineas = [...lineas];
	}

	function eliminarLinea(id: string) {
		if (lineas.length > 1) {
			lineas = lineas.filter((l) => l.id !== id);
		}
	}

	function actualizarPrecioLinea(idx: number, productoId: string) {
		if (productoId && productoId !== 'personalizado') {
			const producto = productos.find((p) => p.id.toString() === productoId);
			if (producto) {
				lineas[idx].precio = producto.precio_base || 0;
			}
		}
	}

	function calcularTotal() {
		return lineas.reduce((sum, l) => sum + l.cantidad * l.precio, 0);
	}
</script>

<PageLayout>
	<!-- Header -->
	<PageHeader
		title="Nuevo Pedido"
		description="Completa el formulario para crear un nuevo pedido"
	/>

	<!-- Form -->
	<form {...form} class="space-y-6">
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
					bind:value={clienteSeleccionado}
					required={true}
					onChange={(val) => {
						const hiddenInput = document.querySelector(
							'input[name="cliente_id"]'
						) as HTMLInputElement;
						if (hiddenInput) hiddenInput.value = val;
					}}
				/>
				<input type="hidden" name="cliente_id" value={clienteSeleccionado} />
				{#each form.fields?.cliente_id?.issues() as issue (issue)}
					<p class="text-sm text-error">{issue.message}</p>
				{/each}

				<!-- Fecha de entrega -->
				<FormField
					label="Fecha de entrega prometida"
					id="fecha_entrega_prometida"
					{...form.fields?.fecha_entrega_prometida?.as('date')}
				/>

				<!-- Seña -->
				<FormField
					label="Seña (opcional)"
					step="0.01"
					id="seña"
					placeholder="0.00"
					{...form.fields?.seña?.as('number')}
				/>
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
				{#each lineas as linea, idx (linea.id)}
					<div class="card border border-base-300 bg-base-100">
						<div class="p-4">
							<button
								type="button"
								onclick={() => eliminarLinea(linea.id)}
								class="btn absolute top-2 right-2 btn-circle btn-ghost btn-xs"
								class:hidden={lineas.length === 1}
							>
								✕
							</button>

							<div class="grid gap-4 md:grid-cols-4">
								<!-- Producto -->
								<SearchSelect
									id={`lineas[${idx}].producto_id`}
									label="Producto"
									options={[
										{ value: 'personalizado', label: '📝 Personalizado' },
										...productos.map((p) => ({
											value: p.id.toString(),
											label: p.nombre
										}))
									]}
									placeholder="Seleccionar producto..."
									bind:value={linea.producto_id}
									onChange={(val) => {
										linea.producto_id = val;
										actualizarPrecioLinea(idx, val);
									}}
								/>

								<!-- Descripción (si es personalizado) -->
								{#if linea.producto_id === 'personalizado'}
									<FormField
										label="Descripción"
										id={`lineas[${idx}].descripcion`}
										type="text"
										bind:value={linea.descripcion}
									/>
								{/if}

								<!-- Cantidad -->
								<FormField
									label="Cantidad"
									id={`lineas[${idx}].cantidad`}
									type="number"
									min="1"
									bind:value={linea.cantidad}
								/>

								<!-- Precio -->
								<FormField
									label="Precio unitario"
									id={`lineas[${idx}].precio`}
									type="number"
									step="0.01"
									min="0"
									bind:value={linea.precio}
								/>
							</div>

							<!-- Hidden fields -->
							<input type="hidden" name={`lineas[${idx}].producto_id`} value={linea.producto_id} />
							<input type="hidden" name={`lineas[${idx}].cantidad`} value={linea.cantidad} />
							<input type="hidden" name={`lineas[${idx}].precio`} value={linea.precio} />
							<input type="hidden" name={`lineas[${idx}].descripcion`} value={linea.descripcion} />
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
						${calcularTotal().toLocaleString('es-AR', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</p>
				</div>
			</div>
		</fieldset>

		<!-- Observaciones -->
		<fieldset class="fieldset">
			<legend class="fieldset-legend text-lg">Notas</legend>

			<FormField
				label="Observaciones"
				id="observaciones"
				placeholder="Notas adicionales sobre el pedido..."
				textarea={true}
				rows={3}
				{...form.fields?.observaciones?.as('text')}
			/>
		</fieldset>

		<!-- Errores -->
		{#if form?.fields?.allIssues?.()?.length}
			<div role="alert" class="alert gap-4 alert-error">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
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
