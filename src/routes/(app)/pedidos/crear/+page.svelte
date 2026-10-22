<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { crearPedido } from '$lib/remote/pedidos.remote';
	import { obtenerContactosCliente } from '$lib/remote/contactos.remote';
	import { getProductos } from '$lib/remote/productos.remote';
	import {
		getCategoriasInsumo,
		getInsumos,
		getTiposInsumo,
		getUnidadesInsumo
	} from '$lib/remote/insumos.remote';
	import LineasConceptosEditor from '$lib/components/cotizaciones/LineasConceptosEditor.svelte';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { FormActions, FormErrors, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/types/cotizacion-editor';
	import { formatearDosDecimales, redondearPrecio } from '$lib/utils/precios';

	let form = crearPedido;
	let clientes = await obtenerContactosCliente({ limit: 100 });
	let productosResultado = await getProductos({ limit: 100 });
	let insumosResultado = await getInsumos({ limit: 100 });
	let tiposInsumo = await getTiposInsumo();
	let categoriasInsumo = await getCategoriasInsumo();
	let unidadesInsumo = await getUnidadesInsumo();
	const productos: ProductoOpcion[] = productosResultado.data.map((producto) => ({
		id: producto.id,
		nombre: producto.nombre,
		costo_materiales: producto.costo_materiales,
		precio_venta: producto.precio_venta
	}));
	const insumos: InsumoOpcion[] = insumosResultado.data.map((insumo) => ({
		id: insumo.id,
		codigo: insumo.codigo,
		nombre: insumo.nombre,
		unidad: insumo.unidad,
		costo_unitario: insumo.costo_unitario
	}));
	let usarCreditoDistribuidor = $state(false);
	let clienteSeleccionadoId = $state('');
	let distribuidorSeleccionadoId = $state('');
	let porcentajeComisionDistribuidor = $state(0);
	let archivosSeleccionados = $state<File[]>([]);
	let vistasPrevias = $state<{ archivo: File; url: string }[]>([]);
	let subiendoArchivos = $state(false);

	function serializarLineas(lineas: LineaEdicion[]) {
		return JSON.stringify(
			lineas.map((linea) => ({
				tipo: linea.tipo,
				visible_cliente: linea.visible_cliente,
				producto_id: linea.producto_id || undefined,
				insumo_id: linea.tipo === 'insumo' ? Number(linea.insumo_id) || undefined : undefined,
				nuevo_insumo: linea.nuevo_insumo,
				cantidad: linea.cantidad,
				precio: linea.precio_unitario,
				precio_lista: linea.precio_lista_unitario,
				costo_materiales: linea.costo_materiales,
				descripcion: linea.descripcion,
				insumos_asociados:
					linea.tipo === 'concepto'
						? linea.insumos_snapshot
								.filter((material) => material.insumo_id != null)
								.map((material) => ({
									insumo_id: Number(material.insumo_id),
									cantidad: material.cantidad
								}))
						: []
			}))
		);
	}

	const lineaInicial: LineaEdicion = {
		idx: 0,
		tipo: 'producto',
		visible_cliente: true,
		producto_id: '',
		insumo_id: undefined,
		insumos_snapshot: [],
		unidad: '',
		descripcion: '',
		cantidad: 1,
		precio_unitario: 0,
		precio_lista_unitario: 0,
		precio_minimo_unitario: 0,
		costo_materiales: 0
	};
	let lineas = $state<LineaEdicion[]>([lineaInicial]);
	form.fields.lineas.set(serializarLineas([lineaInicial]));

	let total = $derived(
		redondearPrecio(
			lineas
				.filter((linea) => linea.visible_cliente)
				.reduce((sum, linea) => sum + linea.cantidad * linea.precio_unitario, 0)
		)
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

	function seleccionarArchivos(event: Event) {
		for (const vista of vistasPrevias) if (vista.url) URL.revokeObjectURL(vista.url);
		const input = event.currentTarget as HTMLInputElement;
		archivosSeleccionados = Array.from(input.files ?? []);
		vistasPrevias = archivosSeleccionados.map((archivo) => ({
			archivo,
			url: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : ''
		}));
	}

	function quitarArchivo(archivo: File) {
		const vista = vistasPrevias.find((item) => item.archivo === archivo);
		if (vista?.url) URL.revokeObjectURL(vista.url);
		archivosSeleccionados = archivosSeleccionados.filter((item) => item !== archivo);
		vistasPrevias = vistasPrevias.filter((item) => item.archivo !== archivo);
	}

	async function subirArchivos(pedidoId: number) {
		if (!archivosSeleccionados.length) return;
		const datos = new FormData();
		datos.set('tipo', 'pedido');
		datos.set('entidad_id', String(pedidoId));
		for (const archivo of archivosSeleccionados) datos.append('archivos', archivo);
		const response = await fetch(resolve('/adjuntos'), { method: 'POST', body: datos });
		const resultado: { error?: string; resultados?: { error?: string }[] } = await response.json();
		if (!response.ok || resultado.resultados?.some((item) => item.error)) {
			throw new Error(resultado.error || 'No se pudieron subir todos los archivos');
		}
	}

	onDestroy(() => {
		for (const vista of vistasPrevias) if (vista.url) URL.revokeObjectURL(vista.url);
	});

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
					const pedidoId = form.result?.pedidoId;
					if (!pedidoId) throw new Error('No se recibió el número de pedido');
					toast.success('Pedido creado');
					if (archivosSeleccionados.length) {
						subiendoArchivos = true;
						try {
							await subirArchivos(pedidoId);
						} catch {
							toast.warning(
								'El pedido se creó, pero no se pudieron subir todos los archivos. Podés reintentarlo desde el detalle.'
							);
						} finally {
							subiendoArchivos = false;
						}
					}
					await goto(resolve(`/pedidos/${pedidoId}`));
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
						Saldo disponible: ${formatearDosDecimales(distribuidorSeleccionado.saldo_disponible)}
					</p>
				{/if}
				{#if distribuidorSeleccionado}
					<FormFieldWrapper
						label="Comisión del distribuidor (%)"
						id="porcentaje_comision_distribuidor"
					>
						<input
							class="remove-arrow input input-sm"
							min="0"
							max="100"
							step="0.01"
							{...form.fields?.porcentaje_comision_distribuidor?.as(
								'number',
								porcentajeComisionDistribuidor
							)}
						/>
						<p class="mt-1 text-xs text-base-content/70">
							Se descontarán ${formatearDosDecimales(montoComisionDistribuidor)} al entregar. Saldo posterior:
							${formatearDosDecimales(saldoLuegoDeEntrega)}
						</p>
						{#if saldoLuegoDeEntrega < 0}
							<p class="mt-1 text-xs text-error">El saldo no alcanza para cubrir la comisión.</p>
						{/if}
					</FormFieldWrapper>
				{/if}

				<!-- Fecha de entrega -->
				<FormFieldWrapper label="Fecha de entrega prometida" id="fecha_entrega_prometida">
					<input
						class="input input-sm"
						{...form.fields?.fecha_entrega_prometida?.as('date')}
						min={new Date().toISOString().split('T')[0]}
					/>
				</FormFieldWrapper>

				<!-- Anticipo -->
				<FormFieldWrapper label="Anticipo (opcional)" id="anticipo">
					<input
						class="remove-arrow input input-sm"
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
							class="remove-arrow input input-sm"
							placeholder="0.00"
							min="0"
							step="0.01"
							{...form.fields?.monto_credito_distribuidor?.as('number')}
						/>
					</FormFieldWrapper>
				</div>
			{/if}
		</fieldset>

		<LineasConceptosEditor
			bind:lineas
			{productos}
			{insumos}
			{tiposInsumo}
			{categoriasInsumo}
			{unidadesInsumo}
			bloqueada={!!form.pending}
			contexto="pedido"
			descuentoGlobal={0}
			totalBase={total}
			importeDescuento={0}
			incluirIva={false}
			importeIva={0}
			onChange={(nuevasLineas) => form.fields.lineas.set(serializarLineas(nuevasLineas))}
		/>
		<div class="divider"></div>
		<div class="flex justify-end">
			<div class="text-right">
				<p class="text-sm text-base-content/70">Total</p>
				<p class="text-3xl font-bold">${formatearDosDecimales(total)}</p>
			</div>
		</div>

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

		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Archivos adjuntos</legend>
			<FormFieldWrapper label="Archivos adjuntos" id="archivos">
				<input
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,application/pdf"
					class="file-input w-full"
					disabled={subiendoArchivos || !!form.pending}
					onchange={seleccionarArchivos}
				/>
			</FormFieldWrapper>
			{#if vistasPrevias.length}
				<div class="flex flex-wrap gap-3">
					{#each vistasPrevias as vista (vista.archivo)}
						<div class="flex items-center gap-2 rounded border border-base-300 p-2">
							{#if vista.url}
								<img src={vista.url} alt={vista.archivo.name} class="h-16 w-16 object-cover" />
							{/if}
							<span class="max-w-48 truncate text-sm">{vista.archivo.name}</span>
							<button
								type="button"
								class="btn btn-ghost btn-xs"
								aria-label={`Quitar ${vista.archivo.name}`}
								disabled={subiendoArchivos || !!form.pending}
								onclick={() => quitarArchivo(vista.archivo)}>✕</button
							>
						</div>
					{/each}
				</div>
			{/if}
		</fieldset>

		<FormErrors {form} />

		<!-- Actions -->
		<FormActions
			cancelHref={Paths.PEDIDOS}
			pending={!!form.pending || subiendoArchivos}
			pendingText="Creando pedido..."
			submitText="Crear Pedido"
		/>
	</form>
</PageLayout>
