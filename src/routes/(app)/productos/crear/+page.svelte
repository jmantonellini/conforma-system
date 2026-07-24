<script lang="ts">
	import { getModelos, getCategoriasComp, crearProducto } from '$lib/remote/productos.remote';
	import { PageLayout, FormFieldWrapper, FormActions } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let categorias = page.data.categorias;
	let marcas = page.data.marcas;
	let tiposDeUso = page.data.tiposDeUso;
	let tiposVehiculo = page.data.tiposVehiculo;

	let modelos = $derived(
		crearProducto.fields.marca_id.value()
			? await getModelos(Number(crearProducto.fields.marca_id.value() as string))
			: []
	);
</script>

<PageLayout>
	<form
		{...crearProducto.enhance(async (form) => {
			try {
				if (await form.submit()) {
					toast.success('Producto creado!');
					form.element.reset();
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
				<div class="grid gap-4 md:grid-cols-3">
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
			{/if}
		{/if}
		<FormActions
			cancelHref="/productos"
			pending={!!crearProducto.pending}
			submitText="Guardar Producto"
		/>
	</form>
</PageLayout>
