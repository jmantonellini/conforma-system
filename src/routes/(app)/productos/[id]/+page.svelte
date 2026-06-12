<script lang="ts">
	import {
		getTiposVehiculo,
		getMarcas,
		getModelos,
		getTiposUso,
		getCategoriasComp,
		actualizarProducto,
		getCategorias,
		getProductoById
	} from '$lib/remote/productos.remote';
	import { PageLayout, PageHeader, FormFieldWrapper, FormActions } from '$lib/components/ui';
	import { toast } from '$lib/toast/toast.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	// Cargar datos del producto
	const producto = await getProductoById(page.params.id ?? '');
	const categorias = await getCategorias();
	const tiposVehiculo = await getTiposVehiculo();
	const marcas = await getMarcas();
	const tiposUso = await getTiposUso();

	const form = actualizarProducto;

	// Inicializar el formulario con los datos del producto
	form.fields.set({
		...producto,
		categoria_id: producto.categoria_id ? producto.categoria_id.toString() : ''
	});

	let modelos = $derived(
		form.fields.marca_id.value()
			? await getModelos(parseInt(form.fields.marca_id.value() as string))
			: []
	);

	let categoriasComp = $derived(
		form.fields.tipo_uso_id.value() === '2'
			? await getCategoriasComp(parseInt(form.fields.tipo_uso_id.value() as string))
			: []
	);

	let showDeleteModal = $state(false);
</script>

<PageLayout>
	<PageHeader title="Editar Producto" description="Modifica los datos del producto" />
	<div class="flex items-center justify-between">
		<a href={resolve('/productos')} class="btn btn-ghost btn-sm">← Volver</a>
		<button class="btn btn-outline btn-sm btn-error" onclick={() => {}}>Eliminar</button>
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
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper label="Código" id="codigo">
					<input class="input" {...form.fields.codigo.as('text', producto.codigo)} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Nombre" id="nombre">
					<input class="input" {...form.fields.nombre.as('text', producto.nombre)} />
				</FormFieldWrapper>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormFieldWrapper label="Categoría de producto" id="categoria_id">
					<select {...form.fields.categoria_id.as('select')} class="select w-full">
						<option value="">Seleccionar...</option>
						{#each categorias as cat (cat.id)}
							<option value={cat.id.toString()}>{cat.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Precio Base" id="precio_base">
					<input class="input remove-arrow" step="0.01" {...form.fields.precio_base.as('number')} />
				</FormFieldWrapper>
			</div>
		</fieldset>

		<!-- Vehículo (solo si categoría es Escape) -->
		{#if form.fields.categoria_id.value() === '1'}
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Vehículo</legend>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<FormFieldWrapper label="Tipo" id="tipo_vehiculo_id">
						<select {...form.fields.tipo_vehiculo_id.as('select')} class="select w-full">
							<option value="">Seleccionar...</option>
							{#each tiposVehiculo as tv (tv.id)}
								<option value={tv.id.toString()}>{tv.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>

					<FormFieldWrapper label="Marca" id="marca_id">
						<select
							{...form.fields.marca_id.as('select')}
							class="select w-full"
							disabled={!form.fields.tipo_vehiculo_id.value()}
						>
							<option value="">Seleccionar...</option>
							{#each marcas as m (m.id)}
								<option value={m.id.toString()}>{m.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>

					<FormFieldWrapper label="Modelo" id="modelo_id">
						<select
							{...form.fields.modelo_id.as('select')}
							class="select w-full"
							disabled={!form.fields.marca_id.value()}
						>
							<option value="">Seleccionar...</option>
							{#each modelos as mod (mod.id)}
								<option value={mod.id.toString()}>{mod.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormFieldWrapper label="Tipo de uso" id="tipo_uso_id">
						<select {...form.fields.tipo_uso_id.as('select')} class="select w-full">
							<option value="">Seleccionar...</option>
							{#each tiposUso as tu (tu.id)}
								<option value={tu.id.toString()}>{tu.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>

					{#if form.fields.tipo_uso_id.value() === '2'}
						<FormFieldWrapper label="Categoría de competencia" id="categoria_competencia_id">
							<select {...form.fields.categoria_competencia_id.as('select')} class="select w-full">
								<option value="">Seleccionar...</option>
								{#each categoriasComp as cat (cat.id)}
									<option value={cat.id.toString()}>{cat.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
					{/if}
				</div>
			</fieldset>

			<!-- Medidas (solo si es Escape) -->
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">📐 Medidas Primario</legend>
				<div class="grid grid-cols-2 gap-4">
					<FormFieldWrapper label="Diámetro" id="medidas_primario_diametro">
						<input class="input remove-arrow" {...form.fields.medidas_primario_diametro.as('number')} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Largo" id="medidas_primario_largo">
						<input class="input remove-arrow" {...form.fields.medidas_primario_largo.as('number')} />
					</FormFieldWrapper>
				</div>
			</fieldset>

			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">📐 Medidas Secundario</legend>
				<div class="grid grid-cols-2 gap-4">
					<FormFieldWrapper label="Diámetro" id="medidas_secundario_diametro">
						<input class="input remove-arrow" {...form.fields.medidas_secundario_diametro.as('number')} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Largo" id="medidas_secundario_largo">
						<input class="input remove-arrow" {...form.fields.medidas_secundario_largo.as('number')} />
					</FormFieldWrapper>
				</div>
			</fieldset>

			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">🎺 Trombon</legend>
				<div class="grid grid-cols-2 gap-4">
					<FormFieldWrapper label="Diámetro Inicial" id="trombon_diametro_inicial">
						<input class="input remove-arrow" {...form.fields.trombon_diametro_inicial.as('number')} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Largo" id="trombon_largo">
						<input class="input remove-arrow" {...form.fields.trombon_largo.as('number')} />
					</FormFieldWrapper>
				</div>
				<FormFieldWrapper label="Observaciones" id="trombon_observaciones">
					<textarea rows={3} {...form.fields.trombon_observaciones.as('text')}></textarea>
				</FormFieldWrapper>
			</fieldset>
		{/if}

		<FormActions
			cancelHref="/productos"
			pending={!!form.pending}
			submitText="Actualizar Producto"
		/>
	</form>
</PageLayout>

//TODO ACTUALIZAR A REMOTE FUNCTIONS

<!-- Modal eliminar -->
{#if showDeleteModal}
	<dialog class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Eliminar Pedido</h3>
			<p class="py-4">¿Eliminar el pedido {producto?.id}?</p>
			<div class="modal-action">
				<button class="btn" onclick={() => (showDeleteModal = false)}>Cancelar</button>
				<form method="POST" action="?/eliminar">
					<button type="submit" class="btn btn-error">Eliminar</button>
				</form>
			</div>
		</div>
	</dialog>
{/if}
