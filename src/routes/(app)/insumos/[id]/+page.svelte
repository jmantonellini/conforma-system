<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Can,
		EncabezadoDetalle,
		FormActions,
		FormErrors,
		FormFieldWrapper,
		PageLayout
	} from '$lib/components/ui';
	import {
		actualizarInsumo,
		getCategoriasInsumo,
		obtenerProveedores,
		getTiposInsumo,
		getUnidadesInsumo
	} from '$lib/remote/insumos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let form = actualizarInsumo;
	let imagen = $state<File | null>(null);
	let imagenPreview = $state('');

	function seleccionarImagen(event: Event) {
		if (imagenPreview) URL.revokeObjectURL(imagenPreview);
		imagen = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		imagenPreview = imagen ? URL.createObjectURL(imagen) : '';
	}

	async function subirImagen() {
		if (!imagen) return;
		const datos = new FormData();
		datos.set('imagen', imagen);
		const response = await fetch(resolve(`/insumos/${data.insumo.id}/imagen`), {
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
	<EncabezadoDetalle
		titulo={data.insumo.nombre}
		subtitulo={data.insumo.codigo}
		volver={{ href: '/insumos', etiqueta: 'Insumos' }}
	/>
	<Can modulo="insumos" accion="edit">
		<form
			{...form.enhance(async (formInstance) => {
				try {
					if (await formInstance.submit()) {
						try {
							await subirImagen();
							toast.success('Insumo actualizado');
						} catch (error) {
							toast.warning(
								error instanceof Error
									? `Insumo actualizado, pero no se pudo guardar la imagen: ${error.message}`
									: 'Insumo actualizado, pero no se pudo guardar la imagen'
							);
						}
						goto(resolve('/insumos'));
					}
				} catch {
					toast.error('No se pudo actualizar el insumo');
				}
			})}
			class="flex flex-col gap-4 seccion"
		>
			<div class="contents">
				<input type="hidden" name="id" value={data.insumo.id} />
				<div class="grid gap-4 md:grid-cols-5">
					<FormFieldWrapper label="Código" id="codigo" required
						><input
							class="input"
							{...form.fields.codigo.as('text', data.insumo.codigo)}
						/></FormFieldWrapper
					>
					<FormFieldWrapper label="Descripción" id="nombre" required
						><input
							class="input"
							{...form.fields.nombre.as('text', data.insumo.nombre)}
						/></FormFieldWrapper
					>
					<FormFieldWrapper label="Imagen" id="imagen">
						<input
							class="file-input w-full"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onchange={seleccionarImagen}
						/>
						{#if imagenPreview || data.insumo.imagen_key}
							<img
								class="mt-2 h-24 w-24 rounded border border-base-300 object-cover"
								src={imagenPreview || resolve(`/insumos/${data.insumo.id}/imagen`)}
								alt="Imagen de {data.insumo.nombre}"
							/>
						{/if}
						{#if data.insumo.imagen_key}
							<button
								class="btn self-start btn-ghost btn-xs"
								type="button"
								onclick={async () => {
									const response = await fetch(resolve(`/insumos/${data.insumo.id}/imagen`), {
										method: 'DELETE'
									});
									if (!response.ok) {
										toast.error('No se pudo quitar la imagen');
										return;
									}
									await invalidateAll();
									toast.success('Imagen quitada');
								}}
							>
								Quitar imagen
							</button>
						{/if}
					</FormFieldWrapper>
					<FormFieldWrapper label="Tipo" id="tipo"
						><select
							class="select"
							{...form.fields.tipo.as('select', data.insumo.tipo?.id?.toString() ?? '')}
							>{#each await getTiposInsumo() as tipo (tipo.id)}<option value={String(tipo.id)}
									>{tipo.nombre}</option
								>{/each}</select
						></FormFieldWrapper
					>
					<FormFieldWrapper label="Categoría" id="categoria_id"
						><select
							class="select"
							{...form.fields.categoria_id.as('select', data.insumo.categoria_id?.toString() ?? '')}
							><option value="">Sin categoría</option
							>{#each await getCategoriasInsumo() as categoria (categoria.id)}<option
									value={String(categoria.id)}>{categoria.nombre}</option
								>{/each}</select
						></FormFieldWrapper
					>
					<FormFieldWrapper label="Unidad" id="unidad" required
						><select
							class="select"
							{...form.fields.unidad.as('select', data.insumo.unidad_id?.toString() ?? '')}
							>{#each await getUnidadesInsumo() as unidad (unidad.id)}<option
									value={String(unidad.id)}>{unidad.nombre}</option
								>
							{/each}</select
						></FormFieldWrapper
					>
					<FormFieldWrapper label="Proveedor" id="proveedor_id">
						<select
							class="select"
							{...form.fields.proveedor_id.as('select', data.insumo.proveedor_id?.toString() ?? '')}
						>
							<option value="">Sin proveedor</option>
							{#each await obtenerProveedores() as proveedor (proveedor.id)}
								<option value={String(proveedor.id)}>{proveedor.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Costo unitario" id="costo_unitario" required
						><input
							class="input"
							min="0"
							step="0.01"
							{...form.fields.costo_unitario.as(
								'number',
								data.insumo.costo_unitario / (1 + (data.insumo.flete_porcentaje ?? 0) / 100)
							)}
						/></FormFieldWrapper
					>
					<FormFieldWrapper label="Flete (%)" id="flete_porcentaje">
						<input
							class="input"
							min="0"
							step="0.01"
							{...form.fields.flete_porcentaje.as('number', data.insumo.flete_porcentaje ?? 0)}
						/>
					</FormFieldWrapper>
				</div>
				<FormErrors {form} />
				<FormActions
					cancelHref={resolve('/insumos')}
					pending={!!form.pending}
					submitText="Guardar cambios"
				/>
			</div>
		</form>
	</Can>
</PageLayout>
