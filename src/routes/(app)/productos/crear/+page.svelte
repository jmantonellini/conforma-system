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

	let categorias = page.data.categorias;
	let marcas = page.data.marcas;
	let tiposDeUso = page.data.tiposDeUso;
	let tiposVehiculo = page.data.tiposVehiculo;
	let insumos = (await getInsumos({ limit: 100 })).data;
	let productos = (await getProductos({ limit: 100 })).data;
	let receta = $state([{ insumo_id: '', producto_id: '', cantidad: 1 }]);

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
			class="space-y-6"
		>
			<input type="hidden" name="receta" value={JSON.stringify(receta)} />
			<!-- Datos básicos -->
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Datos básicos</legend>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<FormFieldWrapper label="Código" id="codigo">
						<input class="input" {...crearProducto.fields.codigo.as('text')} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Nombre" id="nombre">
						<input class="input" {...crearProducto.fields.nombre.as('text')} />
					</FormFieldWrapper>

					<!-- Categoría de producto y precio -->
					<FormFieldWrapper label="Categoría de producto" id="categoria_id">
						<select {...crearProducto.fields.categoria_id.as('select')} class="select w-full">
							<option value="">Seleccionar...</option>
							{#each categorias as cat (cat.id)}
								<option value={String(cat.id)}>{cat.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Precio Base" id="precio_base">
						<input class="input" step="0.01" {...crearProducto.fields.precio_base.as('number')} />
					</FormFieldWrapper>
				</div>
			</fieldset>

			<!-- Vehículo -->
			{#if crearProducto.fields.categoria_id.value() === '1'}
				<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
					<legend class="fieldset-legend">Vehículo</legend>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FormFieldWrapper label="Tipo" id="tipo_vehiculo_id">
							<select {...crearProducto.fields.tipo_vehiculo_id.as('select')} class="select w-full">
								<option value="">Seleccionar...</option>
								{#each tiposVehiculo as tv (tv.id)}
									<option value={String(tv.id)}>{tv.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>

						<FormFieldWrapper label="Marca" id="marca_id">
							<select
								{...crearProducto.fields.marca_id.as('select')}
								class="select w-full"
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
								class="select w-full"
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
							<select {...crearProducto.fields.tipo_uso_id.as('select')} class="select w-full">
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
									class="select w-full"
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
				{#if crearProducto.fields.categoria_id.value() === '1'}
					<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
						<legend class="fieldset-legend">Aspectos técnicos</legend>

						<div class="grid grid-cols-3 gap-4">
							<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
								<legend class="fieldset-legend">Medidas Primario</legend>

								<div class="grid grid-cols-2 gap-4">
									<FormFieldWrapper label="Diámetro" id="medidas_primario_diametro">
										<input
											class="remove-arrow input"
											{...crearProducto.fields.medidas_primario_diametro.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Largo" id="medidas_primario_largo">
										<input
											class="remove-arrow input"
											{...crearProducto.fields.medidas_primario_largo.as('number')}
										/></FormFieldWrapper
									>
								</div>
							</fieldset>

							<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
								<legend class="fieldset-legend">Medidas Secundario</legend>
								<div class="grid grid-cols-2 gap-4">
									<FormFieldWrapper label="Diámetro" id="medidas_secundario_diametro">
										<input
											class="remove-arrow input"
											{...crearProducto.fields.medidas_secundario_diametro.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Largo" id="medidas_secundario_largo"
										><input
											class="remove-arrow input"
											{...crearProducto.fields.medidas_secundario_largo.as('number')}
										/>
									</FormFieldWrapper>
								</div>
							</fieldset>

							<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
								<legend class="fieldset-legend">Trombon</legend>
								<div class="grid grid-cols-2 gap-4">
									<FormFieldWrapper label="Diámetro Inicial" id="trombon_diametro_inicial">
										<input
											class="remove-arrow input"
											{...crearProducto.fields.trombon_diametro_inicial.as('number')}
										/>
									</FormFieldWrapper>
									<FormFieldWrapper label="Largo" id="trombon_largo">
										<input
											class="remove-arrow input"
											{...crearProducto.fields.trombon_largo.as('number')}
										/>
									</FormFieldWrapper>
								</div>
							</fieldset>
							<fieldset
								class="fieldset rounded-box border border-base-300 bg-base-200 p-4 lg:col-span-3"
							>
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
						</div>
					</fieldset>
				{/if}
			{/if}

			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Receta del producto</legend>
				<div class="space-y-3">
					{#each receta as linea, indice (indice)}
						<div class="grid gap-1 sm:grid-cols-[minmax(0,1fr)_8rem_auto_auto] sm:items-center">
							<div class="fieldset min-w-0">
								<SearchSelect
									label="Componente"
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
							</div>
							<div class="fieldset">
								<span class="label">Cantidad</span>
								<input
									class="remove-arrow input"
									type="number"
									min="0"
									step="0.01"
									bind:value={linea.cantidad}
								/>
							</div>
							<span class="label whitespace-nowrap">
								Unidad: <strong
									>{insumos.find((insumo) => String(insumo.id) === linea.insumo_id)?.unidad ??
										(linea.producto_id ? 'Producto' : '-')}</strong
								>
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
					<button type="button" class="btn btn-outline btn-sm" onclick={agregarInsumo}
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
