<script lang="ts">
	import {
		getTiposVehiculo,
		getMarcas,
		getModelos,
		getTiposUso,
		getCategoriasComp,
		crearProducto,
		getCategorias
	} from '$lib/remote/productos.remote';
	import { PageLayout, PageHeader, FormFieldWrapper, FormActions } from '$lib/components/ui';
	import { toast } from '$lib/toast/toast.svelte';
</script>

<PageLayout>
	<PageHeader title="Nuevo Producto" description="Completa los datos del producto" />

	<form
		{...crearProducto.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success('Cliente creado!');
					form.element.reset();
				} else {
					toast.error('Error de validación');
				}
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (error) {
				toast.error('Error del servidor');
			}
		})}
		class="space-y-6"
	>
		<!-- Datos básicos -->
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Datos básicos</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper label="Código" id="codigo">
					<input class="input" {...crearProducto.fields.codigo.as('text')} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Nombre" id="nombre">
					<input class="input" {...crearProducto.fields.nombre.as('text')} />
				</FormFieldWrapper>
			</div>

			<!-- Categoría de producto y precio -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper label="Categoría de producto" id="categoria_id">
					<select {...crearProducto.fields.categoria_id.as('select')} class="select w-full">
						<option value="">Seleccionar...</option>
						{#each await getCategorias() as cat (cat.id)}
							<option value={cat.id.toString()}>{cat.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Precio Base" id="precio_base">
					<input class="input" step="0.01" {...crearProducto.fields.precio_base.as('text')} />
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
							{#each await getTiposVehiculo() as tv (tv.id)}
								<option value={tv.id.toString()}>{tv.nombre}</option>
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
							{#each await getMarcas() as m (m.id)}
								<option value={m.id.toString()}>{m.nombre}</option>
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
							{#each await getModelos(parseInt(crearProducto.fields.marca_id.value() as string)) as mod (mod.id)}
								<option value={mod.id.toString()}>{mod.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormFieldWrapper label="Tipo de uso" id="tipo_uso_id">
						<select {...crearProducto.fields.tipo_uso_id.as('select')} class="select w-full">
							<option value="">Seleccionar...</option>
							{#each await getTiposUso() as tu (tu.id)}
								<option value={tu.id.toString()}>{tu.nombre}</option>
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
								{#each await getCategoriasComp(parseInt(crearProducto.fields.tipo_uso_id.value() as string)) as cat (cat.id)}
									<option value={cat.id.toString()}>{cat.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
					{/if}
				</div>
			</fieldset>

			<!-- Medidas (solo si categoría_id === 1) -->
			{#if crearProducto.fields.categoria_id.value() === '1'}
				<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
					<legend class="fieldset-legend">📐 Medidas Primario</legend>
					<div class="grid grid-cols-2 gap-4">
						<FormFieldWrapper label="Diámetro" id="medidas_primario_diametro">
							<input
								class="input remove-arrow"
								{...crearProducto.fields.medidas_primario_diametro.as('number')}
							/>
						</FormFieldWrapper>
						<FormFieldWrapper label="Largo" id="medidas_primario_largo">
							<input
								class="input remove-arrow"
								{...crearProducto.fields.medidas_primario_largo.as('number')}
							/></FormFieldWrapper
						>
					</div>
				</fieldset>

				<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
					<legend class="fieldset-legend">📐 Medidas Secundario</legend>
					<div class="grid grid-cols-2 gap-4">
						<FormFieldWrapper label="Diámetro" id="medidas_secundario_diametro">
							<input
								class="input remove-arrow"
								{...crearProducto.fields.medidas_secundario_diametro.as('number')}
							/>
						</FormFieldWrapper>
						<FormFieldWrapper label="Largo" id="medidas_secundario_largo"
							><input
								class="input remove-arrow"
								{...crearProducto.fields.medidas_secundario_largo.as('number')}
							/>
						</FormFieldWrapper>
					</div>
				</fieldset>

				<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
					<legend class="fieldset-legend">🎺 Trombon</legend>
					<div class="grid grid-cols-2 gap-4">
						<FormFieldWrapper label="Diámetro Inicial" id="trombon_diametro_inicial">
							<input
								class="input remove-arrow"
								{...crearProducto.fields.trombon_diametro_inicial.as('number')}
							/>
						</FormFieldWrapper>
						<FormFieldWrapper label="Largo" id="trombon_largo">
							<input class="input remove-arrow" {...crearProducto.fields.trombon_largo.as('number')} />
						</FormFieldWrapper>
					</div>
					<FormFieldWrapper label="Observaciones" id="trombon_observaciones">
						<textarea
							class="textarea resize-none"
							rows={3}
							{...crearProducto.fields.trombon_observaciones.as('text')}
						>
						</textarea>
					</FormFieldWrapper>
				</fieldset>
			{/if}
		{/if}
		<FormActions
			cancelHref="/productos"
			pending={!!crearProducto.pending}
			submitText="Guardar Producto"
		/>
	</form>
</PageLayout>
