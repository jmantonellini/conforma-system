<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { crearPedido } from '$lib/modulos/pedidos/pedidos.remote';
	import { getDatosCreacionPedido } from '$lib/modulos/pedidos/pedidos-consultas.remote';
	import { getProductosCatalogo } from '$lib/modulos/productos/productos.remote';
	import { obtenerContactosCliente } from '$lib/modulos/contactos/contactos.remote';
	import LineasConceptosEditor from '$lib/modulos/cotizaciones/componentes/LineasConceptosEditor.svelte';
	import ContactoRapido from '$lib/modulos/contactos/componentes/ContactoRapido.svelte';
	import SearchSelect from '$lib/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/ui/FormFieldWrapper.svelte';
	import { FormActions, FormErrors, PageLayout } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { Paths } from '$lib/tipos';
	import { can } from '$lib/utils/permissions';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/modulos/cotizaciones/tipos';
	import {
		formatearDosDecimales,
		formatearMoneda,
		parsearNumeroDecimal,
		redondearPrecio
	} from '$lib/utils/precios';
	import { MONEDAS, NOMBRE_MONEDA, type Moneda } from '$lib/utils/moneda';
	import { getDolarBNA } from '$lib/modulos/ventas/moneda.remote';
	import { fechaInputManana } from '$lib/utils/fechas';

	let form = crearPedido;
	const contactoSolicitadoId = page.url.searchParams.get('contacto') ?? '';
	const productoInicialId = page.url.searchParams.get('producto') ?? '';
	const ubicacionInicialId = page.url.searchParams.get('stockUbicacion') ?? '';
	const puedeReservarStock = can(page.data.user, page.data.permisos, 'stock', 'edit');
	const datosCreacion = await getDatosCreacionPedido({
		contactoId: contactoSolicitadoId || undefined,
		productoId: productoInicialId || undefined,
		stockUbicacionId: ubicacionInicialId || undefined,
		incluirStock: puedeReservarStock
	});
	let clientes = datosCreacion.clientes;
	let productosResultado = datosCreacion.productos;
	let stockDisponibilidad = datosCreacion.stock;
	const contactoInicialId = clientes.data.some(
		(cliente) => String(cliente.id) === contactoSolicitadoId
	)
		? contactoSolicitadoId
		: '';
	let insumosResultado = datosCreacion.insumos;
	let tiposInsumo = datosCreacion.tiposInsumo;
	let categoriasInsumo = datosCreacion.categoriasInsumo;
	let unidadesInsumo = datosCreacion.unidadesInsumo;
	let productos = $state<ProductoOpcion[]>(
		productosResultado.data.map((producto) => {
			const detalle = producto as Partial<ProductoOpcion>;
			return {
				id: producto.id,
				nombre: producto.nombre,
				costo_materiales:
					typeof detalle.costo_materiales === 'number' ? detalle.costo_materiales : null,
				precio_venta: typeof detalle.precio_venta === 'number' ? detalle.precio_venta : null
			};
		})
	);
	const insumos: InsumoOpcion[] = insumosResultado.data.map((insumo) => ({
		id: insumo.id,
		codigo: insumo.codigo,
		nombre: insumo.nombre,
		unidad: insumo.unidad,
		costo_unitario: insumo.costo_unitario
	}));
	const dolar = await getDolarBNA().catch(() => null);
	let moneda = $state<Moneda>('USD');
	let tipoCambioTexto = $state(dolar ? formatearDosDecimales(dolar.venta) : '');
	const tipoCambio = $derived(parsearNumeroDecimal(tipoCambioTexto));
	const factor = $derived(moneda === 'ARS' ? (tipoCambio ?? 0) : 1);
	let usarCreditoDistribuidor = $state(false);
	let clienteSeleccionadoId = $state(contactoInicialId);
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
				stock_ubicacion_id: Number(linea.stock_ubicacion_id) || undefined,
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
	const productoInicialCatalogo = datosCreacion.productos.data.find(
		(producto) => String(producto.id) === productoInicialId
	);
	const productoInicialDetalle = productoInicialCatalogo as
		| (typeof productoInicialCatalogo & { costo_materiales?: number; precio_venta?: number })
		| undefined;
	const disponibilidadInicial = stockDisponibilidad.balances.find(
		(balance) =>
			String(balance.producto_id) === productoInicialId &&
			String(balance.ubicacion_id) === ubicacionInicialId &&
			balance.disponible > 0
	);
	const ubicacionInicial = stockDisponibilidad.ubicaciones.find(
		(ubicacion) =>
			String(ubicacion.id) === ubicacionInicialId &&
			String(ubicacion.contacto_distribuidor_id) === contactoInicialId
	);
	const lineasIniciales =
		productoInicialDetalle && disponibilidadInicial && ubicacionInicial
			? [
					{
						...lineaInicial,
						producto_id: String(productoInicialDetalle.id),
						stock_ubicacion_id: ubicacionInicialId,
						descripcion: productoInicialDetalle.nombre,
						costo_materiales: redondearPrecio(productoInicialDetalle.costo_materiales ?? 0),
						precio_lista_unitario: redondearPrecio(productoInicialDetalle.precio_venta ?? 0),
						precio_minimo_unitario: redondearPrecio(productoInicialDetalle.precio_venta ?? 0),
						precio_unitario: redondearPrecio(productoInicialDetalle.precio_venta ?? 0)
					}
				]
			: [lineaInicial];
	let lineas = $state<LineaEdicion[]>(lineasIniciales);

	function reescalarLineas(proporcion: number) {
		if (!Number.isFinite(proporcion) || proporcion <= 0 || proporcion === 1) return;
		const escalar = (valor: number) => redondearPrecio(valor * proporcion);
		lineas = lineas.map((linea) => ({
			...linea,
			precio_unitario: escalar(linea.precio_unitario),
			precio_lista_unitario: escalar(linea.precio_lista_unitario),
			precio_minimo_unitario: escalar(linea.precio_minimo_unitario),
			costo_materiales: escalar(linea.costo_materiales),
			insumos_snapshot: linea.insumos_snapshot.map((material) => ({
				...material,
				costo_unitario:
					material.costo_unitario === undefined ? undefined : escalar(material.costo_unitario),
				subtotal: material.subtotal === undefined ? undefined : escalar(material.subtotal)
			}))
		}));
		form.fields.lineas.set(serializarLineas(lineas));
	}

	function cambiarMoneda(nueva: Moneda) {
		const anterior = factor;
		moneda = nueva;
		if (anterior > 0 && factor > 0) reescalarLineas(factor / anterior);
	}

	function cambiarTipoCambio(texto: string) {
		const anterior = factor;
		tipoCambioTexto = texto;
		if (moneda === 'ARS' && anterior > 0 && factor > 0) reescalarLineas(factor / anterior);
	}
	if (contactoInicialId) form.fields.contacto_id.set(contactoInicialId);
	form.fields.lineas.set(serializarLineas(lineasIniciales));

	let total = $derived(
		redondearPrecio(
			lineas
				.filter((linea) => linea.visible_cliente)
				.reduce((sum, linea) => sum + linea.cantidad * linea.precio_unitario, 0)
		)
	);
	let clientesOptions = $state(
		clientes.data.length > 0
			? clientes.data.map((c) => ({
					value: c.id.toString(),
					label: [c.nombre, c.apellido].filter(Boolean).join(' ') || c.razon_social
				}))
			: []
	);
	let distribuidoresOptions = $state(
		clientes.data.filter((c) => c.es_distribuidor).length > 0
			? clientes.data
					.filter((c) => c.es_distribuidor)
					.map((c) => ({
						value: c.id.toString(),
						label: `${[c.nombre, c.apellido].filter(Boolean).join(' ') || c.razon_social} (distribuidor)`
					}))
			: []
	);

	let solicitudClientes = 0;
	let solicitudDistribuidores = 0;
	let solicitudProductos = 0;

	let altaContacto: ContactoRapido;

	function contactoCreado(contacto: { id: number; razon_social: string }) {
		const opcion = { value: String(contacto.id), label: contacto.razon_social };
		clientesOptions = [opcion, ...clientesOptions.filter((item) => item.value !== opcion.value)];
		form.fields.contacto_id.set(opcion.value);
		clienteSeleccionadoId = opcion.value;
	}

	async function buscarClientes(search: string) {
		const solicitud = ++solicitudClientes;
		const resultado = await obtenerContactosCliente({ search: search || undefined, limit: 100 });
		if (solicitud !== solicitudClientes) return;
		clientesOptions = resultado.data.map((cliente) => ({
			value: String(cliente.id),
			label: [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') || cliente.razon_social
		}));
	}

	async function buscarDistribuidores(search: string) {
		const solicitud = ++solicitudDistribuidores;
		const resultado = await obtenerContactosCliente({
			search: search || undefined,
			limit: 100,
			soloDistribuidores: true
		});
		if (solicitud !== solicitudDistribuidores) return;
		distribuidoresOptions = resultado.data.map((distribuidor) => ({
			value: String(distribuidor.id),
			label: `${[distribuidor.nombre, distribuidor.apellido].filter(Boolean).join(' ') || distribuidor.razon_social} (distribuidor)`
		}));
	}

	async function buscarProductos(search: string) {
		const solicitud = ++solicitudProductos;
		const resultado = await getProductosCatalogo({ search: search || undefined, limit: 100 });
		if (solicitud !== solicitudProductos) return;
		productos = resultado.data.map((producto) => ({
			id: producto.id,
			nombre: producto.nombre,
			costo_materiales: null,
			precio_venta: null
		}));
	}

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

	let distribuidorSeleccionado = $derived(
		clientes.data.find((cliente) => cliente.id.toString() === distribuidorSeleccionadoId)
	);
	let montoComisionDistribuidor = $derived(
		Number((total * (porcentajeComisionDistribuidor / 100)).toFixed(2))
	);
	let saldoLuegoDeEntrega = $derived(
		redondearPrecio(
			Number(distribuidorSeleccionado?.saldo_disponible ?? 0) -
				montoComisionDistribuidor / (factor || 1)
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
				toast.error(mensajeError(error, 'Error al crear el pedido'));
			}
		})}
		class="space-y-6"
	>
		<fieldset class="fieldset seccion">
			<legend class="fieldset-legend">Información del Cliente</legend>

			<div class="grid gap-4 md:grid-cols-4">
				<SearchSelect
					compacto
					id="contacto_id"
					label="Cliente"
					options={clientesOptions}
					placeholder="Buscar cliente..."
					field={form.fields.contacto_id}
					onChange={(value) => (clienteSeleccionadoId = value)}
					onSearch={buscarClientes}
					onCreate={(texto) => altaContacto.abrir(texto)}
					createLabel="Crear contacto"
				/>

				<SearchSelect
					compacto
					id="contacto_distribuidor_id"
					label="Distribuidor (opcional)"
					options={distribuidoresOptions}
					placeholder="Buscar distribuidor..."
					field={form.fields.contacto_distribuidor_id}
					onChange={onDistribuidorChange}
					onSearch={buscarDistribuidores}
				/>
				{#if distribuidorSeleccionado}
					<p class="self-end text-sm text-base-content/70">
						Saldo disponible: {formatearMoneda(distribuidorSeleccionado.saldo_disponible)}
					</p>
				{/if}
				{#if distribuidorSeleccionado}
					<FormFieldWrapper
						label="Comisión del distribuidor (%)"
						id="porcentaje_comision_distribuidor"
					>
						<input
							class="input input-sm"
							min="0"
							max="100"
							step="0.01"
							{...form.fields?.porcentaje_comision_distribuidor?.as(
								'number',
								porcentajeComisionDistribuidor
							)}
						/>
						<p class="mt-1 text-xs text-base-content/70">
							Se descontarán {formatearMoneda(montoComisionDistribuidor, moneda)} al entregar. Saldo posterior:
							{formatearMoneda(saldoLuegoDeEntrega)}
						</p>
						{#if saldoLuegoDeEntrega < 0}
							<p class="mt-1 text-xs text-error">El saldo no alcanza para cubrir la comisión.</p>
						{/if}
					</FormFieldWrapper>
				{/if}

				<FormFieldWrapper label="Moneda" id="moneda">
					<select
						class="select select-sm"
						name="moneda"
						value={moneda}
						onchange={(event) => cambiarMoneda(event.currentTarget.value as Moneda)}
					>
						{#each MONEDAS as opcion (opcion)}
							<option value={opcion}>{NOMBRE_MONEDA[opcion]} ({opcion})</option>
						{/each}
					</select>
				</FormFieldWrapper>

				{#if moneda === 'ARS'}
					<FormFieldWrapper
						label="Tipo de cambio"
						id="tipo_cambio"
						ayuda="Pesos por US$ 1. Por defecto, dólar BNA vendedor."
					>
						<input
							class={['input input-sm', !tipoCambio && 'input-error']}
							inputmode="decimal"
							value={tipoCambioTexto}
							onchange={(event) => cambiarTipoCambio(event.currentTarget.value)}
						/>
						<input type="hidden" name="n:tipo_cambio" value={tipoCambio ?? ''} />
					</FormFieldWrapper>
				{/if}

				<FormFieldWrapper label="Fecha de entrega prometida" id="fecha_entrega_prometida">
					<input
						class="input input-sm"
						{...form.fields?.fecha_entrega_prometida?.as('date', fechaInputManana())}
						min={fechaInputManana()}
					/>
				</FormFieldWrapper>

				<FormFieldWrapper label="Anticipo (opcional)" id="anticipo">
					<input
						class="input input-sm"
						placeholder="0"
						min="0"
						{...form.fields?.anticipo?.as('number')}
					/>
				</FormFieldWrapper>

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
							class="input input-sm"
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
			onBuscarProducto={buscarProductos}
			stockDisponibilidad={stockDisponibilidad.balances}
			{insumos}
			{tiposInsumo}
			{categoriasInsumo}
			{unidadesInsumo}
			bloqueada={!!form.pending || factor <= 0}
			{moneda}
			{factor}
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
				<p class="text-3xl font-bold">{formatearMoneda(total, moneda)}</p>
			</div>
		</div>

		<fieldset class="fieldset seccion">
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

		<fieldset class="fieldset seccion">
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

		<FormActions
			cancelHref={resolve(Paths.PEDIDOS)}
			pending={!!form.pending || subiendoArchivos}
			pendingText="Creando pedido..."
			submitText="Crear Pedido"
		/>
	</form>
</PageLayout>

<ContactoRapido bind:this={altaContacto} onCreado={contactoCreado} />
