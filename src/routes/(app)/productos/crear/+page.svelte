<script lang="ts">
	import {
		getModelos,
		getCategoriasComp,
		crearProducto,
		getProductos,
		getAtributosCategoria
	} from '$lib/modulos/productos/productos.remote';
	import { getInsumos } from '$lib/modulos/insumos/insumos.remote';
	import { Can, PageLayout, FormFieldWrapper, FormActions, SearchSelect, Seccion } from '$lib/ui';
	import { Delete } from '$lib/ui/icons';
	import { toast } from '$lib/ui/toast.svelte';
	import { page } from '$app/state';
	import { afterNavigate, goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { calcularPrecioVenta, formatearMoneda, redondearPrecio } from '$lib/utils/precios';
	import { CATEGORIAS_PRODUCTO, TIPOS_USO_PRODUCTO } from '$lib/modulos/productos/tipos';
	import AtributosCampos from '$lib/modulos/productos/componentes/AtributosCampos.svelte';
	import type { ValoresAtributos } from '$lib/modulos/productos/atributos';

	let categorias: { id: number; nombre: string; slug: string }[] = page.data.categorias;
	let marcas = page.data.marcas;
	let tiposDeUso: { id: number; nombre: string; slug: string }[] = page.data.tiposDeUso;
	let tiposVehiculo = page.data.tiposVehiculo;
	let form = crearProducto;
	let planosSeleccionados = $state<File[]>([]);
	let referenciasSeleccionadas = $state<File[]>([]);
	let subiendoAdjuntos = $state(false);
	let insumos = $state((await getInsumos({ limit: 100 })).data);
	let productos = $state((await getProductos({ limit: 100 })).data);
	let receta = $state([{ insumo_id: '', producto_id: '', cantidad: 1 }]);
	let costoReceta = $derived(
		redondearPrecio(
			receta.reduce((total, linea) => {
				const insumo = insumos.find((item) => String(item.id) === linea.insumo_id);
				const producto = productos.find((item) => String(item.id) === linea.producto_id);
				return total + (insumo?.costo_unitario ?? producto?.costo_materiales ?? 0) * linea.cantidad;
			}, 0)
		)
	);
	let margenPorcentaje = $derived(Number(crearProducto.fields.margen_porcentaje.value() ?? 0));
	let categoriaSeleccionada = $derived(
		categorias.find(
			(categoria) => String(categoria.id) === crearProducto.fields.categoria_id.value()
		)
	);
	let valoresAtributos = $state<ValoresAtributos>({});
	const definiciones = $derived(
		crearProducto.fields.categoria_id.value()
			? await getAtributosCategoria(Number(crearProducto.fields.categoria_id.value()))
			: []
	);
	let tipoUsoSeleccionado = $derived(
		tiposDeUso.find((tipoUso) => String(tipoUso.id) === crearProducto.fields.tipo_uso_id.value())
	);
	let precioVenta = $derived(calcularPrecioVenta(costoReceta, margenPorcentaje));

	let solicitudInsumos = 0;
	let solicitudProductos = 0;

	async function buscarInsumos(search: string) {
		const solicitud = ++solicitudInsumos;
		const resultado = await getInsumos({ search: search || undefined, limit: 100 });
		if (solicitud === solicitudInsumos) insumos = resultado.data;
	}

	async function buscarProductos(search: string) {
		const solicitud = ++solicitudProductos;
		const resultado = await getProductos({ search: search || undefined, limit: 100 });
		if (solicitud === solicitudProductos) productos = resultado.data;
	}

	function agregarInsumo() {
		receta = [...receta, { insumo_id: '', producto_id: '', cantidad: 1 }];
	}

	function quitarInsumo(indice: number) {
		if (receta.length > 1) receta = receta.filter((_, i) => i !== indice);
	}

	function seleccionarPlanos(event: Event) {
		planosSeleccionados = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
	}

	function seleccionarReferencias(event: Event) {
		referenciasSeleccionadas = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
	}

	async function subirArchivosProducto(productoId: number, archivos: File[], esPlano: boolean) {
		if (!archivos.length) return;
		const formData = new FormData();
		formData.set('tipo', 'producto');
		formData.set('entidad_id', String(productoId));
		formData.set('accion', 'create');
		formData.set('categoria', esPlano ? 'plano' : 'general');
		for (const archivo of archivos) formData.append('archivos', archivo);

		const response = await fetch(resolve('/adjuntos'), { method: 'POST', body: formData });
		const resultado = (await response.json().catch(() => null)) as {
			error?: string;
			resultados?: { nombre: string; error?: string }[];
		} | null;
		if (!response.ok) throw new Error(resultado?.error || 'No se pudieron subir los archivos');
		const fallidos = (resultado?.resultados ?? []).filter((archivo) => archivo.error);
		if (fallidos.length) {
			throw new Error(fallidos.map((archivo) => `${archivo.nombre}: ${archivo.error}`).join(' · '));
		}
	}

	let modelos = $derived(
		crearProducto.fields.marca_id.value()
			? await getModelos(Number(crearProducto.fields.marca_id.value()))
			: []
	);

	afterNavigate(() => {
		form.element?.reset();
	});
</script>

<PageLayout>
	<Can modulo="productos" accion="create">
		<form
			{...form.enhance(async (form) => {
				try {
					if (await form.submit()) {
						const productoId = form.result?.producto?.id;
						toast.success('Producto creado!');
						if (productoId) {
							subiendoAdjuntos = true;
							try {
								await subirArchivosProducto(productoId, planosSeleccionados, true);
								await subirArchivosProducto(productoId, referenciasSeleccionadas, false);
							} catch (error) {
								toast.warning(
									error instanceof Error
										? `El producto se creó, pero algunos archivos no se subieron: ${error.message}`
										: 'El producto se creó, pero algunos archivos no se subieron.'
								);
							} finally {
								subiendoAdjuntos = false;
							}
						}
						await getProductos({}).refresh();
						await invalidateAll();
						await goto(resolve('/productos'));
					} else {
						toast.error('Error de validación');
					}
				} catch (error) {
					console.log(error);

					toast.error('Error del servidor');
				}
			})}
			class="space-y-3"
		>
			<input type="hidden" name="receta" value={JSON.stringify(receta)} />
			<fieldset class="fieldset seccion">
				<legend class="fieldset-legend">Datos básicos</legend>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-7">
					<FormFieldWrapper label="Código" id="codigo">
						<input class="input input-sm" {...crearProducto.fields.codigo.as('text')} />
					</FormFieldWrapper>
					<FormFieldWrapper class="lg:col-span-2" label="Nombre" id="nombre">
						<input class="input input-sm" {...crearProducto.fields.nombre.as('text')} />
					</FormFieldWrapper>

					<FormFieldWrapper label="Categoría de producto" id="categoria_id">
						<select
							{...crearProducto.fields.categoria_id.as('select')}
							class="select w-full select-sm"
						>
							<option value="">Seleccionar...</option>
							{#each categorias as cat (cat.id)}
								<option value={String(cat.id)}>{cat.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Margen bruto (%)" id="margen_porcentaje">
						<input
							class="input input-sm"
							min="0"
							max="99.99"
							step="0.01"
							{...crearProducto.fields.margen_porcentaje.as('number')}
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

			{#if categoriaSeleccionada?.slug === CATEGORIAS_PRODUCTO.ESCAPES}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<fieldset class="fieldset space-y-3 rounded-box border border-base-300 bg-base-200 p-4">
						<legend class="fieldset-legend">Vehículo</legend>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<FormFieldWrapper label="Tipo" id="tipo_vehiculo_id">
								<select
									{...crearProducto.fields.tipo_vehiculo_id.as('select')}
									class="select w-full select-sm"
								>
									<option value="">Seleccionar...</option>
									{#each tiposVehiculo as tv (tv.id)}
										<option value={String(tv.id)}>{tv.nombre}</option>
									{/each}
								</select>
							</FormFieldWrapper>

							<FormFieldWrapper label="Marca" id="marca_id">
								<select
									{...crearProducto.fields.marca_id.as('select')}
									class="select w-full select-sm"
									disabled={!crearProducto.fields.tipo_vehiculo_id}
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
									{...crearProducto.fields.modelo_id.as('select')}
									class="select w-full select-sm"
									disabled={!crearProducto.fields.marca_id}
								>
									<option value="">Seleccionar...</option>
									{#each modelos as mod (mod.id)}
										<option value={String(mod.id)}>{mod.nombre}</option>
									{/each}
								</select>
							</FormFieldWrapper>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormFieldWrapper
								label="Año desde"
								id="anio_desde"
								error={crearProducto.fields.anio_desde.issues()?.[0]?.message}
							>
								<input
									{...crearProducto.fields.anio_desde.as('number')}
									id="anio_desde"
									class="input w-full input-sm"
									min="1900"
									max="2100"
									step="1"
									placeholder="Ej: 2010"
								/>
							</FormFieldWrapper>
							<FormFieldWrapper
								label="Año hasta"
								id="anio_hasta"
								ayuda="Vacío si sigue vigente"
								error={crearProducto.fields.anio_hasta.issues()?.[0]?.message}
							>
								<input
									{...crearProducto.fields.anio_hasta.as('number')}
									id="anio_hasta"
									class="input w-full input-sm"
									min="1900"
									max="2100"
									step="1"
									placeholder="Ej: 2016"
								/>
							</FormFieldWrapper>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormFieldWrapper label="Tipo de uso" id="tipo_uso_id">
								<select
									{...crearProducto.fields.tipo_uso_id.as('select')}
									class="select w-full select-sm"
								>
									<option value="">Seleccionar...</option>
									{#each tiposDeUso as tu (tu.id)}
										<option value={String(tu.id)}>{tu.nombre}</option>
									{/each}
								</select>
							</FormFieldWrapper>

							{#if tipoUsoSeleccionado?.slug === TIPOS_USO_PRODUCTO.COMPETENCIA}
								<FormFieldWrapper label="Categoría de competencia" id="categoria_competencia_id">
									<select
										{...crearProducto.fields.categoria_competencia_id.as('select')}
										class="select w-full select-sm"
									>
										<option value="">Seleccionar...</option>
										{#each await getCategoriasComp(Number(crearProducto.fields.tipo_vehiculo_id.value())) as cat (cat.id)}
											<option value={String(cat.id)}>{cat.nombre}</option>
										{/each}
									</select>
								</FormFieldWrapper>
							{/if}
						</div>
					</fieldset>
				</div>
			{/if}

			{#if definiciones.length}
				<Seccion titulo="Medidas">
					<AtributosCampos {definiciones} bind:valores={valoresAtributos} />
				</Seccion>
			{/if}

			<Seccion titulo="Notas de fabricación" descripcion="Se imprimen en la orden de fabricación.">
				<textarea
					id="notas_fabricacion"
					class="textarea w-full"
					rows={3}
					{...crearProducto.fields.notas_fabricacion.as('text')}></textarea>
			</Seccion>

			<fieldset class="fieldset seccion">
				<legend class="fieldset-legend">Receta del producto</legend>
				<div class="flex flex-col gap-2">
					{#each receta as linea, indice (indice)}
						<div
							class="mb-1 grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,50px))] gap-2 sm:items-center"
						>
							<SearchSelect
								compacto
								label=""
								id={`receta-create-${indice}`}
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
										linea.insumo_id = tipo === 'insumo' ? id : '';
										linea.producto_id = tipo === 'producto' ? id : '';
									}
								}}
								onSearch={async (search) => {
									await Promise.all([buscarInsumos(search), buscarProductos(search)]);
								}}
								options={[
									...insumos.map((insumo) => ({
										value: `insumo:${insumo.id}`,
										label: `${insumo.codigo} - ${insumo.nombre}`
									})),
									...productos.map((producto) => ({
										value: `producto:${producto.id}`,
										label: `${producto.codigo} - ${producto.nombre}`
									}))
								]}
								onChange={(value: string) => {
									const [tipo, id] = value.split(':');
									linea.insumo_id = tipo === 'insumo' ? id : '';
									linea.producto_id = tipo === 'producto' ? id : '';
								}}
							/>
							<input
								class="input w-full min-w-0 text-right input-sm"
								type="number"
								min="0"
								step="0.01"
								bind:value={linea.cantidad}
							/>
							<span class="label truncate whitespace-nowrap">
								{insumos.find((insumo) => String(insumo.id) === linea.insumo_id)?.unidad ??
									(linea.producto_id ? 'Producto' : '-')}
							</span>
							<button
								type="button"
								class="btn btn-square btn-ghost text-error btn-sm sm:justify-self-end"
								title="Quitar componente"
								aria-label="Quitar componente"
								onclick={() => quitarInsumo(indice)}><Delete /></button
							>
						</div>
					{/each}
					<button type="button" class="btn w-fit btn-outline btn-sm" onclick={agregarInsumo}
						>+ Agregar componente</button
					>
				</div>
			</fieldset>
			<fieldset class="fieldset seccion">
				<legend class="fieldset-legend">Planos, fotos y referencias</legend>
				<div class="grid gap-4 md:grid-cols-2">
					<FormFieldWrapper id="planos_producto" label="Planos de fabricación">
						<input
							type="file"
							multiple
							accept="image/jpeg,image/png,image/webp"
							class="file-input w-full"
							disabled={!!crearProducto.pending || subiendoAdjuntos}
							onchange={seleccionarPlanos}
						/>
						{#if planosSeleccionados.length}
							<p class="mt-1 text-sm text-base-content/60">
								{planosSeleccionados.map((archivo) => archivo.name).join(', ')}
							</p>
						{/if}
					</FormFieldWrapper>
					<FormFieldWrapper id="referencias_producto" label="Fotos y referencias">
						<input
							type="file"
							multiple
							accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,application/pdf"
							class="file-input w-full"
							disabled={!!crearProducto.pending || subiendoAdjuntos}
							onchange={seleccionarReferencias}
						/>
						{#if referenciasSeleccionadas.length}
							<p class="mt-1 text-sm text-base-content/60">
								{referenciasSeleccionadas.map((archivo) => archivo.name).join(', ')}
							</p>
						{/if}
					</FormFieldWrapper>
				</div>
			</fieldset>
			<FormActions
				cancelHref={resolve('/productos')}
				pending={!!crearProducto.pending || subiendoAdjuntos}
				submitText="Guardar Producto"
			/>
		</form>
	</Can>
</PageLayout>
