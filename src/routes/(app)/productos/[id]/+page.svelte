<script lang="ts">
	import {
		getModelos,
		getCategoriasComp,
		actualizarProducto,
		eliminarProducto
	} from '$lib/remote/productos.remote';
	import {
		Can,
		FormErrors,
		PageLayout,
		FormFieldWrapper,
		FormActions,
		SearchSelect
	} from '$lib/components/ui';
	import { Delete } from '$lib/components/ui/icons';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Cargar datos del producto
	let categorias = page.data.categorias;
	let tiposVehiculo = page.data.tiposVehiculo;
	let marcas = page.data.marcas;

	let tiposUso = page.data.tiposDeUso;

	let form = actualizarProducto;

	let categoriaActual = $derived(
		form.fields.categoria_id.value() ?? String(data.producto.categoria_id)
	);
	let tipoVehiculoActual = $derived(
		form.fields.tipo_vehiculo_id.value() ?? String(data.producto.tipo_vehiculo_id)
	);
	let marcaActual = $derived(form.fields.marca_id.value() ?? String(data.producto.marca_id));
	let tipoUsoActual = $derived(
		form.fields.tipo_uso_id.value() ?? String(data.producto.tipo_uso_id)
	);

	let showDeleteModal = $state(false);
	let receta = $state<Array<{ insumo_id: string; producto_id: string; cantidad: number }>>([]);

	$effect(() => {
		receta = (data.receta ?? []).map((linea) => ({
			insumo_id: String(linea.insumo_id),
			producto_id: '',
			cantidad: linea.cantidad
		}));
	});
	let costoReceta = $derived(
		receta.reduce((total, linea) => {
			const insumo = data.insumos.find((item) => item.id === Number(linea.insumo_id));
			return total + (insumo?.costo_unitario ?? 0) * Number(linea.cantidad || 0);
		}, 0)
	);
	let precioBaseActual = $derived(
		Number(form.fields.precio_base.value() ?? data.producto.precio_base ?? 0)
	);
	let precioConInsumos = $derived(precioBaseActual + costoReceta);

	function agregarInsumo() {
		receta = [...receta, { insumo_id: '', producto_id: '', cantidad: 1 }];
	}
</script>

<PageLayout>
	<div class="flex items-center justify-between">
		<button onclick={() => history.back()} class="btn btn-ghost btn-sm">← Volver</button>
		<Can modulo="productos" accion="delete">
			<button class="btn btn-outline btn-error btn-sm" onclick={() => (showDeleteModal = true)}
				>Eliminar</button
			>
		</Can>
	</div>
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
				} catch (error) {
					console.log(error);
					toast.error('Error del servidor');
				}
			})}
			class="space-y-6"
		>
			<input type="hidden" name="id" value={page.params.id} />
			<input type="hidden" name="receta" value={JSON.stringify(receta)} />

			<!-- Datos básicos -->
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
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
					<FormFieldWrapper label="Márgen ganancia" id="precio_base">
						<input
							class="remove-arrow input"
							step="0.01"
							{...form.fields.precio_base.as('number', data.producto.precio_base ?? 0)}
						/>
					</FormFieldWrapper>
					<div class="stat rounded-box border border-primary/30 bg-primary/5 p-3">
						<div class="stat-title">Precio final</div>
						<div class="stat-value text-2xl text-primary">
							${precioConInsumos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
						</div>
					</div>
				</div>
			</fieldset>

			<!-- Vehículo (solo si categoría es Escape) -->
			{#if categoriaActual === '1'}
				<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
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
								{#each await getModelos(Number(marcaActual)) as mod (mod.id)}
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

						{#if tipoUsoActual === '2'}
							<FormFieldWrapper label="Categoría de competencia" id="categoria_competencia_id">
								<select
									{...form.fields.categoria_competencia_id.as(
										'select',
										String(data.producto.categoria_competencia_id)
									)}
									class="select w-full"
								>
									<option value="">Seleccionar...</option>
									{#each await getCategoriasComp(Number(tipoVehiculoActual)) as cat (cat.id)}
										<option value={String(cat.id)}>{cat.nombre}</option>
									{/each}
								</select>
							</FormFieldWrapper>
						{/if}
					</div>
				</fieldset>

				<div class="flex flex-col gap-4 lg:flex-row">
					<!-- Medidas (solo si es Escape) -->
					<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4 lg:w-1/3">
						<legend class="fieldset-legend">Medidas Primario</legend>
						<div class="grid grid-cols-2 gap-4">
							<FormFieldWrapper label="Diámetro" id="medidas_primario_diametro">
								<input
									class="remove-arrow input"
									{...form.fields.medidas_primario_diametro.as(
										'number',
										data.producto.medidas_primario_diametro ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Largo" id="medidas_primario_largo">
								<input
									class="remove-arrow input"
									{...form.fields.medidas_primario_largo.as(
										'number',
										data.producto.medidas_primario_largo ?? 0
									)}
								/>
							</FormFieldWrapper>
						</div>
					</fieldset>

					<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4 lg:w-1/3">
						<legend class="fieldset-legend">Medidas Secundario</legend>
						<div class="grid grid-cols-2 gap-4">
							<FormFieldWrapper label="Diámetro" id="medidas_secundario_diametro">
								<input
									class="remove-arrow input"
									{...form.fields.medidas_secundario_diametro.as(
										'number',
										data.producto.medidas_secundario_diametro ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Largo" id="medidas_secundario_largo">
								<input
									class="remove-arrow input"
									{...form.fields.medidas_secundario_largo.as(
										'number',
										data.producto.medidas_secundario_largo ?? 0
									)}
								/>
							</FormFieldWrapper>
						</div>
					</fieldset>
					<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4 lg:w-1/3">
						<legend class="fieldset-legend">Trombon</legend>
						<div class="grid grid-cols-2 gap-4">
							<FormFieldWrapper label="Diámetro Inicial" id="trombon_diametro_inicial">
								<input
									class="remove-arrow input"
									{...form.fields.trombon_diametro_inicial.as(
										'number',
										data.producto.trombon_diametro_inicial ?? 0
									)}
								/>
							</FormFieldWrapper>
							<FormFieldWrapper label="Largo" id="trombon_largo">
								<input class="remove-arrow input" {...form.fields.trombon_largo.as('number')} />
							</FormFieldWrapper>
						</div>
					</fieldset>
				</div>
			{/if}
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Receta del producto</legend>
				{#each receta as linea, indice (indice)}
					<div class="mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-1 sm:items-center">
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
									linea.insumo_id = tipo === 'insumo' ? id : '';
									linea.producto_id = tipo === 'producto' ? id : '';
								}
							}}
							options={[
								...data.insumos.map((insumo) => ({
									value: `insumo:${insumo.id}`,
									label: `${insumo.codigo} - ${insumo.nombre}`
								})),
								...data.productos
									.filter((producto) => producto.id !== data.producto.id)
									.map((producto) => ({
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
							class="remove-arrow input w-16"
							type="number"
							min="0"
							step="0.01"
							bind:value={linea.cantidad}
						/>
						<span class="label whitespace-nowrap"
							>{data.insumos.find((insumo) => String(insumo.id) === linea.insumo_id)?.unidad ??
								'-'}s
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
					<span class="font-semibold"
						>Costo expandido: ${costoReceta.toLocaleString('es-AR', {
							minimumFractionDigits: 2
						})}</span
					>
				</div>
			</fieldset>
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4 lg:w-1/2">
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
				cancelHref="/productos"
				pending={!!form.pending}
				submitText="Actualizar Producto"
			/>
		</form>
	</Can>
</PageLayout>

<!-- Modal eliminar -->
{#if showDeleteModal}
	<dialog class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Eliminar Pedido</h3>
			<p class="py-4">¿Eliminar el producto {data.producto?.id}?</p>
			<div class="modal-action">
				<button class="btn" onclick={() => (showDeleteModal = false)}>Cancelar</button>
				<button class="btn btn-error" onclick={async () => eliminarProducto(data.producto?.id)}
					>Eliminar</button
				>
			</div>
		</div>
	</dialog>
{/if}
