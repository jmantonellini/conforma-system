<script lang="ts">
	import {
		getModelos,
		getCategoriasComp,
		crearProducto,
		getProductos
	} from '$lib/remote/productos.remote';
	import { getInsumos } from '$lib/remote/insumos.remote';
	import { Can, PageLayout, FormFieldWrapper, FormActions, SearchSelect } from '$lib/components/ui';
	import { Delete } from '$lib/components/ui/icons';
	import { toast } from '$lib/stores/toast.svelte';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { calcularPrecioVenta, redondearPrecio } from '$lib/utils/precios';

	let categorias = page.data.categorias;
	let marcas = page.data.marcas;
	let tiposDeUso = page.data.tiposDeUso;
	let tiposVehiculo = page.data.tiposVehiculo;
	let insumos = (await getInsumos({ limit: 100 })).data;
	let productos = (await getProductos({ limit: 100 })).data;
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
	let precioVenta = $derived(calcularPrecioVenta(costoReceta, margenPorcentaje));

	function agregarInsumo() {
		receta = [...receta, { insumo_id: '', producto_id: '', cantidad: 1 }];
	}

	function quitarInsumo(indice: number) {
		if (receta.length > 1) receta = receta.filter((_, i) => i !== indice);
	}

	let modelos = $derived(
		crearProducto.fields.marca_id.value()
			? await getModelos(Number(crearProducto.fields.marca_id.value() as string))
			: []
	);
</script>

<PageLayout>
	<Can modulo="productos" accion="create">
		<form
			{...crearProducto.enhance(async (form) => {
				try {
					if (await form.submit()) {
						await getProductos({}).refresh();
						await invalidateAll();
						toast.success('Producto creado!');
						goto(resolve('/productos'));
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
			<!-- Datos básicos -->
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Datos básicos</legend>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-7">
					<FormFieldWrapper label="Código" id="codigo">
						<input class="input input-sm" {...crearProducto.fields.codigo.as('text')} />
					</FormFieldWrapper>
					<FormFieldWrapper class="lg:col-span-2" label="Nombre" id="nombre">
						<input class="input input-sm" {...crearProducto.fields.nombre.as('text')} />
					</FormFieldWrapper>

					<!-- Categoría de producto y precio -->
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
							${costoReceta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
						</div>
					</div>
					<div class="stat rounded-box border border-primary/30 bg-primary/5 p-3">
						<div class="stat-title">Precio de lista</div>
						<div class="stat-value text-xl text-primary">
							${precioVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
						</div>
					</div>
				</div>
			</fieldset>

			<!-- Vehículo -->
			{#if crearProducto.fields.categoria_id.value() === '1'}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<fieldset class="fieldset rounded-box border space-y-3 border-base-300 bg-base-200 p-4">
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

							{#if crearProducto.fields.tipo_uso_id.value() === '2'}
								<FormFieldWrapper label="Categoría de competencia" id="categoria_competencia_id">
									<select
										{...crearProducto.fields.categoria_competencia_id.as('select')}
										class="select w-full select-sm"
									>
										<option value="">Seleccionar...</option>
										{#each await getCategoriasComp(parseInt(crearProducto.fields.tipo_vehiculo_id.value() as string)) as cat (cat.id)}
											<option value={String(cat.id)}>{cat.nombre}</option>
										{/each}
									</select>
								</FormFieldWrapper>
							{/if}
						</div>
					</fieldset>

					<!-- Medidas (solo si categoría_id === 1) -->
					<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
						<legend class="fieldset-legend">Medidas</legend>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-7">
							<fieldset
								class="fieldset col-span-2 rounded-box border border-base-300 bg-base-200 p-4"
							>
								<legend class="fieldset-legend">Primario</legend>

								<div class="grid grid-cols-2 gap-4">
									<FormFieldWrapper label="Ø" id="medidas_primario_diametro">
										<input
											class="remove-arrow input input-sm"
											{...crearProducto.fields.medidas_primario_diametro.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Largo" id="medidas_primario_largo">
										<input
											class="remove-arrow input input-sm"
											{...crearProducto.fields.medidas_primario_largo.as('number')}
										/>
									</FormFieldWrapper>
								</div>
							</fieldset>

							<fieldset
								class="fieldset col-span-2 rounded-box border border-base-300 bg-base-200 p-4"
							>
								<legend class="fieldset-legend">Secundario</legend>
								<div class="grid grid-cols-2 gap-4">
									<FormFieldWrapper label="Ø" id="medidas_secundario_diametro">
										<input
											class="remove-arrow input input-sm"
											{...crearProducto.fields.medidas_secundario_diametro.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Largo" id="medidas_secundario_largo">
										<input
											class="remove-arrow input input-sm"
											{...crearProducto.fields.medidas_secundario_largo.as('number')}
										/>
									</FormFieldWrapper>
								</div>
							</fieldset>

							<fieldset
								class="fieldset col-span-3 rounded-box border border-base-300 bg-base-200 p-4"
							>
								<legend class="fieldset-legend">Trombon</legend>
								<div class="grid grid-cols-3 gap-4">
									<FormFieldWrapper label="Ø Inicial" id="trombon_diametro_inicial">
										<input
											class="remove-arrow input input-sm"
											{...crearProducto.fields.trombon_diametro_inicial.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Largo" id="trombon_largo">
										<input
										class="remove-arrow input input-sm"
										{...crearProducto.fields.trombon_largo.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Ø Final" id="trombon_diametro_final">
										<input
											class="remove-arrow input input-sm"
											{...crearProducto.fields.trombon_diametro_final.as('number')}
										/>
									</FormFieldWrapper>
								</div>
							</fieldset>
						</div>

						<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
							<legend class="fieldset-legend">Observaciones</legend>
							<FormFieldWrapper id="trombon_observaciones">
								<textarea
									class="textarea w-full resize-none"
									rows={3}
									{...crearProducto.fields.trombon_observaciones.as('text')}
								>
								</textarea>
							</FormFieldWrapper>
						</fieldset>
					</fieldset>
				</div>
			{/if}

			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Receta del producto</legend>
				<div class="flex flex-col gap-2">
					{#each receta as linea, indice (indice)}
						<div class="mb-1 grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,50px))] gap-2 sm:items-center">
							<SearchSelect
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
								class="remove-arrow input input-sm text-right w-full min-w-0"
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
					<button type="button" class="btn btn-outline btn-sm w-fit" onclick={agregarInsumo}
						>+ Agregar componente</button
					>
				</div>
			</fieldset>
			<FormActions
				cancelHref="/productos"
				pending={!!crearProducto.pending}
				submitText="Guardar Producto"
			/>
		</form>
	</Can>
</PageLayout>
