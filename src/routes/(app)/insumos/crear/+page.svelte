<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, FormActions, FormErrors, FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import {
		crearInsumo,
		getCategoriasInsumo,
		obtenerProveedores,
		getTiposInsumo,
		getUnidadesInsumo
	} from '$lib/remote/insumos.remote';
	import { toast } from '$lib/stores/toast.svelte';

	const form = crearInsumo;
	let imagen = $state<File | null>(null);
	let imagenPreview = $state('');

	function seleccionarImagen(event: Event) {
		if (imagenPreview) URL.revokeObjectURL(imagenPreview);
		imagen = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		imagenPreview = imagen ? URL.createObjectURL(imagen) : '';
	}

	async function subirImagen(insumoId: number) {
		if (!imagen) return;
		const datos = new FormData();
		datos.set('imagen', imagen);
		const response = await fetch(resolve(`/insumos/${insumoId}/imagen`), {
			method: 'POST',
			body: datos
		});
		if (!response.ok) {
			const resultado: { error?: string } = await response.json();
			throw new Error(resultado.error || 'No se pudo guardar la imagen');
		}
	}

	onDestroy(() => {
		if (imagenPreview) URL.revokeObjectURL(imagenPreview);
	});
</script>

<PageLayout>
	<a href={resolve('/insumos')} class="btn btn-ghost btn-sm">← Volver</a>
	<Can modulo="insumos" accion="create">
		<form
			{...form.enhance(async (instance) => {
				try {
					if (await instance.submit()) {
						const insumoId = form.result?.insumo?.id;
						if (imagen && insumoId) {
							try {
								await subirImagen(insumoId);
								toast.success('Insumo creado');
							} catch (error) {
								toast.warning(
									error instanceof Error
										? `Insumo creado, pero no se pudo guardar la imagen: ${error.message}`
										: 'Insumo creado, pero no se pudo guardar la imagen'
								);
							}
						}
						if (!imagen || !insumoId) toast.success('Insumo creado');
						goto(resolve('/insumos'));
					}
				} catch {
					toast.error('No se pudo crear el insumo');
				}
			})}
			class="space-y-6"
		>
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend">Datos del insumo</legend>
				<div class="grid gap-4 md:grid-cols-2">
					<FormFieldWrapper label="Código" id="codigo" required>
						<input class="input" {...form.fields.codigo.as('text')} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Descripción" id="nombre" required>
						<input class="input" {...form.fields.nombre.as('text')} />
					</FormFieldWrapper>
					<FormFieldWrapper label="Imagen (opcional)" id="imagen">
						<input
							class="file-input w-full"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onchange={seleccionarImagen}
						/>
						{#if imagenPreview}
							<img
								class="mt-2 h-24 w-24 rounded border border-base-300 object-cover"
								src={imagenPreview}
								alt="Vista previa del insumo"
							/>
						{/if}
					</FormFieldWrapper>
					<FormFieldWrapper label="Tipo" id="tipo" required>
						<select class="select" {...form.fields.tipo.as('select')}>
							{#each await getTiposInsumo() as tipo (tipo.id)}
								<option value={String(tipo.id)}>{tipo.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Categoría" id="categoria_id">
						<select class="select" {...form.fields.categoria_id.as('select')}>
							<option value="">Sin categoría</option>
							{#each await getCategoriasInsumo() as categoria (categoria.id)}
								<option value={String(categoria.id)}>{categoria.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Proveedor" id="proveedor_id">
						<select class="select" {...form.fields.proveedor_id.as('select')}>
							<option value="">Sin proveedor</option>
							{#each await obtenerProveedores() as proveedor (proveedor.id)}
								<option value={String(proveedor.id)}>{proveedor.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Unidad" id="unidad" required>
						<select class="select" {...form.fields.unidad.as('select')}>
							{#each await getUnidadesInsumo() as unidad (unidad.id)}
								<option value={String(unidad.id)}>{unidad.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Costo unitario" id="costo_unitario" required>
						<input
							class="remove-arrow input"
							min="0"
							step="0.01"
							{...form.fields.costo_unitario.as('number')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper label="Flete (%)" id="flete_porcentaje">
						<input
							class="remove-arrow input"
							min="0"
							step="0.01"
							{...form.fields.flete_porcentaje.as('number')}
						/>
					</FormFieldWrapper>
				</div>
			</fieldset>
			<FormErrors {form} />
			<FormActions
				cancelHref={resolve('/insumos')}
				pending={!!form.pending}
				submitText="Crear insumo"
			/>
		</form>
	</Can>
</PageLayout>
