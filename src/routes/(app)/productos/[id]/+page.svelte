<script lang="ts">
	import {
		getModelos,
		getCategoriasComp,
		actualizarProducto,
		eliminarProducto
	} from '$lib/remote/productos.remote';
	import {
		Can,
		EncabezadoDetalle,
		FormErrors,
		PageLayout,
		FormFieldWrapper,
		FormActions,
		SearchSelect
	} from '$lib/components/ui';
	import { Delete } from '$lib/components/ui/icons';
	import ArchivosAdjuntos from '$lib/components/ArchivosAdjuntos.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { calcularPrecioVenta, formatearMoneda, redondearPrecio } from '$lib/utils/precios';
	import type { PageProps } from './$types';
	import { CATEGORIAS_PRODUCTO, TIPOS_USO_PRODUCTO } from '$lib/types/catalogos';

	let { data }: PageProps = $props();

	// Cargar datos del producto
	let categorias: { id: number; nombre: string; slug: string }[] = page.data.categorias;
	let tiposVehiculo = page.data.tiposVehiculo;
	let marcas = page.data.marcas;

	let tiposUso: { id: number; nombre: string; slug: string }[] = page.data.tiposDeUso;

	let form = $derived(actualizarProducto.for(String(data.producto.id)));

	let categoriaActual = $derived(
		form.fields.categoria_id.value() ??
			(data.producto.categoria_id == null ? '' : String(data.producto.categoria_id))
	);
	let tipoVehiculoActual = $derived(
		form.fields.tipo_vehiculo_id.value() ??
			(data.producto.tipo_vehiculo_id == null ? '' : String(data.producto.tipo_vehiculo_id))
	);
	let marcaActual = $derived(
		form.fields.marca_id.value() ??
			(data.producto.marca_id == null ? '' : String(data.producto.marca_id))
	);
	let tipoUsoActual = $derived(
		form.fields.tipo_uso_id.value() ?? String(data.producto.tipo_uso_id)
	);
	let categoriaSeleccionada = $derived(
		categorias.find((categoria) => String(categoria.id) === categoriaActual)
	);
	let tipoUsoSeleccionado = $derived(
		tiposUso.find((tipoUso) => String(tipoUso.id) === tipoUsoActual)
	);

	const mapearReceta = () =>
		(data.receta ?? []).map((linea) => ({
			insumo_id: linea.insumo_id ? String(linea.insumo_id) : '',
			producto_id: linea.producto_id ? String(linea.producto_id) : '',
			cantidad: linea.cantidad
		}));
	let receta = $derived(mapearReceta());
	let opcionesComponentes = $derived.by(() => {
		const opciones: Record<string, { value: string; label: string }> = {};
		for (const insumo of data.insumos) {
			const value = `insumo:${insumo.id}`;
			opciones[value] = {
				value: `insumo:${insumo.id}`,
				label: `${insumo.codigo} - ${insumo.nombre}`
			};
		}
		for (const producto of data.productos) {
			if (producto.id === data.producto.id) continue;
			const value = `producto:${producto.id}`;
			opciones[value] = {
				value: `producto:${producto.id}`,
				label: `${producto.codigo} - ${producto.nombre}`
			};
		}
		for (const linea of data.receta ?? []) {
			if (linea.insumo_id) {
				const value = `insumo:${linea.insumo_id}`;
				opciones[value] = {
					value,
					label: `${linea.codigo ?? ''} - ${linea.nombre ?? 'Insumo'}`
				};
			} else if (linea.producto_id) {
				const value = `producto:${linea.producto_id}`;
				opciones[value] = {
					value,
					label: `${linea.codigo ?? ''} - ${linea.nombre ?? 'Producto'}`
				};
			}
		}
		return Object.values(opciones);
	});
	let costoReceta = $derived(
		redondearPrecio(
			receta.reduce((total, linea) => {
				const insumo = data.insumos.find((item) => item.id === Number(linea.insumo_id));
				const producto = data.productos.find((item) => item.id === Number(linea.producto_id));
				return (
					total +
					(insumo?.costo_unitario ?? producto?.costo_materiales ?? 0) * Number(linea.cantidad || 0)
				);
			}, 0)
		)
	);
	let margenPorcentajeActual = $derived(
		Number(form.fields.margen_porcentaje.value() ?? data.producto.margen_porcentaje ?? 0)
	);
	let precioVenta = $derived(calcularPrecioVenta(costoReceta, margenPorcentajeActual));

	function agregarInsumo() {
		receta = [...receta, { insumo_id: '', producto_id: '', cantidad: 1 }];
	}

	function actualizarLinea(indice: number, cambios: Partial<(typeof receta)[number]>) {
		receta = receta.map((linea, i) => (i === indice ? { ...linea, ...cambios } : linea));
	}
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo={data.producto.nombre}
		subtitulo={data.producto.codigo}
		volver={{ href: '/productos', etiqueta: 'Productos' }}
		eliminar={{
			modulo: 'productos',
			mensaje: `¿Eliminar el producto ${data.producto.nombre}?`,
			onConfirmar: async () => {
				await eliminarProducto(data.producto.id);
				toast.success('Producto eliminado');
				goto(resolve('/productos'));
			}
		}}
	/>
	<Can modulo="productos" accion="edit">
		<form
			{...form.enhance(async (formInstance) => {
				try {
					if (await formInstance.submit()) {
						toast.success('Producto actualizado');
						goto(resolve('/productos'));
					} else {
						toast.error('Error de validación');
					}
				} catch {
					toast.error(
						'No se pudo actualizar el producto. Revisá los datos de la receta e intentá de nuevo.'
					);
				}
			})}
			class="flex flex-col gap-4 sm:gap-6"
		>
			<input type="hidden" name="id" value={page.params.id} />
			<input type="hidden" name="receta" value={JSON.stringify(receta)} />

			<!-- Datos básicos -->
			<fieldset class="fieldset seccion">
				<legend class="fieldset-legend">Datos básicos</legend>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<FormFieldWrapper label="Código" id="codigo">
						<input class="input" {...form.fields.codigo.as('text', data.producto.codigo)} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Nombre" id="nombre">
						<input class="input" {...form.fields.nombre.as('text', data.producto.nombre)} />
					</FormFieldWrapper>

					<FormFieldWrapper label="Categoría de producto" id="categoria_id">
						<select
							{...form.fields.categoria_id.as('select', String(data.producto.categoria_id))}
							class="select w-full"
						>
							<option value="">Seleccionar...</option>
							{#each categorias as cat (cat.id)}
								<option value={String(cat.id)}>{cat.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Margen bruto (%)" id="margen_porcentaje">
						<input
							class="input"
							min="0"
							max="99.99"
							step="0.01"
							{...form.fields.margen_porcentaje.as('number', data.producto.margen_porcentaje ?? 0)}
						/>
					</FormFieldWrapper>
					<div class="stat rounded-box border border-base-300 bg-base-100 p-3">
						<div class="stat-title">Costo de receta</div>
						<div class="stat-value text-xl">
							{formatearMoneda(costoReceta)}
						</div>
					</div>
					<div class="stat rounded-box border border-primary/30 bg-primary/5 p-3">
						<div class="stat-title">Precio de lista</div>
						<div class="stat-value text-xl text-primary">
							{formatearMoneda(precioVenta)}
						</div>
					</div>
				</div>
			</fieldset>

			<!-- Vehículo (solo si categoría es Escape) -->
			{#if categoriaSeleccionada?.slug === CATEGORIAS_PRODUCTO.ESCAPES}
				<fieldset class="fieldset seccion">
					<legend class="fieldset-legend">Vehículo</legend>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FormFieldWrapper label="Tipo" id="tipo_vehiculo_id">
							<select
								{...form.fields.tipo_vehiculo_id.as(
									'select',
									String(data.producto.tipo_vehiculo_id)
								)}
								class="select w-full"
							>
								<option value="">Seleccionar...</option>
								{#each tiposVehiculo as tv (tv.id)}
									<option value={String(tv.id)}>{tv.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>

						<FormFieldWrapper label="Marca" id="marca_id">
							<select
								{...form.fields.marca_id.as('select', String(data.producto.marca_id))}
								class="select w-full"
								disabled={!tipoVehiculoActual}
							>
								<option value="">Seleccionar...</option>
								{#each marcas as m (m.id)}
									<option value={String(m.id)}>
										{#if m.logo_url}<img
												src={m.logo_url}
												alt={m.nombre}
												class="h-5 w-5 object-contain"
											/>
										{/if}
										{m.nombre}</option
									>
								{/each}
							</select>
						</FormFieldWrapper>

						<FormFieldWrapper label="Modelo" id="modelo_id">
							<select
								{...form.fields.modelo_id.as('select', String(data.producto.modelo_id))}
								class="select w-full"
								disabled={!marcaActual}
							>
								<option value="">Seleccionar...</option>
								{#each marcaActual ? await getModelos(Number(marcaActual)) : [] as mod (mod.id)}
									<option value={String(mod.id)}>{mod.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormFieldWrapper label="Tipo de uso" id="tipo_uso_id">
							<select
								{...form.fields.tipo_uso_id.as('select', String(data.producto.tipo_uso_id))}
								class="select w-full"
							>
								<option value="">Seleccionar...</option>
								{#each tiposUso as tu (tu.id)}
									<option value={String(tu.id)}>{tu.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>

						{#if tipoUsoSeleccionado?.slug === TIPOS_USO_PRODUCTO.COMPETENCIA}
							<FormFieldWrapper label="Categoría de competencia" id="categoria_competencia_id">
								<select
									{...form.fields.categoria_competencia_id.as(
										'select',
										String(data.producto.categoria_competencia_id)
									)}
									class="select w-full"
								>
									<option value="">Seleccionar...</option>
									{#each tipoVehiculoActual ? await getCategoriasComp(Number(tipoVehiculoActual)) : [] as cat (cat.id)}
										<option value={String(cat.id)}>{cat.nombre}</option>
									{/each}
								</select>
							</FormFieldWrapper>
						{/if}
					</div>
				</fieldset>

				<div class="flex flex-col gap-4 lg:flex-row">
					<!-- Medidas (solo si es Escape) -->
					<fieldset class="fieldset seccion lg:w-1/3">
						<legend class="fieldset-legend">Medidas Primario</legend>
						<div class="grid grid-cols-2 gap-4">
							<FormFieldWrapper label="Diámetro" id="medidas_primario_diametro">
								<input
									class="input"
									{...form.fields.medidas_primario_diametro.as(
										'number',
										data.producto.medidas_primario_diametro ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Largo" id="medidas_primario_largo">
								<input
									class="input"
									{...form.fields.medidas_primario_largo.as(
										'number',
										data.producto.medidas_primario_largo ?? 0
									)}
								/>
							</FormFieldWrapper>
						</div>
					</fieldset>

					<fieldset class="fieldset seccion lg:w-1/3">
						<legend class="fieldset-legend">Medidas Secundario</legend>
						<div class="grid grid-cols-2 gap-4">
							<FormFieldWrapper label="Diámetro" id="medidas_secundario_diametro">
								<input
									class="input"
									{...form.fields.medidas_secundario_diametro.as(
										'number',
										data.producto.medidas_secundario_diametro ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Largo" id="medidas_secundario_largo">
								<input
									class="input"
									{...form.fields.medidas_secundario_largo.as(
										'number',
										data.producto.medidas_secundario_largo ?? 0
									)}
								/>
							</FormFieldWrapper>
						</div>
					</fieldset>
					<fieldset class="fieldset seccion lg:w-1/3">
						<legend class="fieldset-legend">Trombon</legend>
						<div class="grid grid-cols-2 gap-4">
							<FormFieldWrapper label="Diámetro Inicial" id="trombon_diametro_inicial">
								<input
									class="input"
									{...form.fields.trombon_diametro_inicial.as(
										'number',
										data.producto.trombon_diametro_inicial ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Diámetro Final" id="trombon_diametro_final">
								<input
									class="input"
									{...form.fields.trombon_diametro_final.as(
										'number',
										data.producto.trombon_diametro_final ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Largo" id="trombon_largo">
								<input class="input" {...form.fields.trombon_largo.as('number')} />
							</FormFieldWrapper>
						</div>
					</fieldset>
				</div>
			{/if}
			<fieldset class="fieldset seccion">
				<legend class="fieldset-legend">Receta del producto</legend>
				{#each receta as linea, indice (indice)}
					{@const unidad =
						data.insumos.find((insumo) => String(insumo.id) === linea.insumo_id)?.unidad ??
						(linea.producto_id ? 'Producto' : '-')}
					<div class="mb-1 grid grid-cols-[minmax(0,1fr)_4rem_5rem_2rem] gap-1 sm:items-center">
						<SearchSelect
							label=""
							id={`receta-edit-${indice}`}
							placeholder="Buscar componente..."
							field={{
								value: () =>
									linea.insumo_id
										? `insumo:${linea.insumo_id}`
										: linea.producto_id
											? `producto:${linea.producto_id}`
											: '',
								set: (value: string) => {
									const [tipo, id] = value.split(':');
									actualizarLinea(indice, {
										insumo_id: tipo === 'insumo' ? id : '',
										producto_id: tipo === 'producto' ? id : ''
									});
								}
							}}
							options={opcionesComponentes}
						/>
						<input
							class="input w-16 input-sm"
							type="number"
							min="0"
							step="0.01"
							value={linea.cantidad}
							oninput={(event) =>
								actualizarLinea(indice, {
									cantidad: Number(event.currentTarget.value) || 0
								})}
						/>
						<span class="label w-20 min-w-0 justify-start truncate whitespace-nowrap" title={unidad}
							>{unidad}
						</span>
						<button
							class="btn btn-square btn-ghost text-error btn-sm"
							title="Quitar componente"
							aria-label="Quitar componente"
							type="button"
							onclick={() => (receta = receta.filter((_, i) => i !== indice))}><Delete /></button
						>
					</div>
				{/each}
				<div class="flex items-center justify-between">
					<button class="btn btn-outline btn-sm" type="button" onclick={agregarInsumo}
						>+ Agregar componente</button
					>
					<span class="font-semibold">Costo expandido: {formatearMoneda(costoReceta)}</span>
				</div>
			</fieldset>
			<fieldset class="fieldset seccion lg:w-1/2">
				<legend class="fieldset-legend">Observaciones</legend>
				<FormFieldWrapper id="trombon_observaciones">
					<textarea
						class="textarea w-full resize-none"
						rows={3}
						{...form.fields.trombon_observaciones.as(
							'text',
							data.producto.trombon_observaciones ?? ''
						)}
					></textarea>
				</FormFieldWrapper>
			</fieldset>

			<FormErrors {form} />
			<FormActions
				cancelHref={resolve('/productos')}
				pending={!!form.pending}
				submitText="Actualizar Producto"
			/>
		</form>
	</Can>
	<ArchivosAdjuntos
		tipo="producto"
		entidadId={data.producto.id}
		adjuntos={data.producto.adjuntos}
	/>
</PageLayout>
