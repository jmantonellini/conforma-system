<script lang="ts">
	import {
		getModelos,
		getCategoriasComp,
		actualizarProducto,
		eliminarProducto
	} from '$lib/remote/productos.remote';
	import { PageLayout, FormFieldWrapper, FormActions } from '$lib/components/ui';
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
</script>

<PageLayout>
	<div class="flex items-center justify-between">
		<a href={resolve('/productos')} class="btn btn-ghost btn-sm">← Volver</a>
		<button class="btn btn-outline btn-sm btn-error" onclick={() => (showDeleteModal = true)}
			>Eliminar</button
		>
	</div>
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
				<FormFieldWrapper label="Precio Base" id="precio_base">
					<input
						class="remove-arrow input"
						step="0.01"
						{...form.fields.precio_base.as('number', data.producto.precio_base ?? 0)}
					/>
				</FormFieldWrapper>
			</div>
		</fieldset>

		<!-- Vehículo (solo si categoría es Escape) -->
		{#if categoriaActual === '1'}
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Vehículo</legend>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<FormFieldWrapper label="Tipo" id="tipo_vehiculo_id">
						<select
							{...form.fields.tipo_vehiculo_id.as('select', String(data.producto.tipo_vehiculo_id))}
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
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4 lg:w-1/2">
			<legend class="fieldset-legend">Observaciones</legend>
			<FormFieldWrapper id="trombon_observaciones">
				<textarea
					class="textarea resize-none w-full"
					rows={3}
					{...form.fields.trombon_observaciones.as(
						'text',
						data.producto.trombon_observaciones ?? ''
					)}
				></textarea>
			</FormFieldWrapper>
		</fieldset>

		<FormActions
			cancelHref="/productos"
			pending={!!form.pending}
			submitText="Actualizar Producto"
		/>
	</form>
</PageLayout>

<!-- Modal eliminar -->
{#if showDeleteModal}
	<dialog class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Eliminar Pedido</h3>
			<p class="py-4">¿Eliminar el pedido {producto?.id}?</p>
			<div class="modal-action">
				<button class="btn" onclick={() => (showDeleteModal = false)}>Cancelar</button>
				<button class="btn btn-error" onclick={async () => eliminarProducto(producto?.id)}
					>Eliminar</button
				>
			</div>
		</div>
	</dialog>
{/if}
