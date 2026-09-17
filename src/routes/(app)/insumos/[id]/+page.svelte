<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, FormActions, FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import {
		actualizarInsumo,
		getCategoriasInsumo,
		getTiposInsumo,
		getUnidadesInsumo
	} from '$lib/remote/insumos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let form = actualizarInsumo;
</script>

<PageLayout>
	<button onclick={() => goto(resolve('/insumos'))} class="btn btn-ghost btn-sm">← Volver</button>
	<Can modulo="insumos" accion="edit">
		<form
			{...form.enhance(async (formInstance) => {
				try {
					if (await formInstance.submit()) {
						toast.success('Insumo actualizado');
						goto(resolve('/insumos'));
					}
				} catch {
					toast.error('No se pudo actualizar el insumo');
				}
			})}
			class="card mt-4 bg-base-100 shadow"
		>
			<div class="card-body">
				<input type="hidden" name="id" value={data.insumo.id} />
				<h1 class="card-title">Editar insumo</h1>
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
					<FormFieldWrapper label="Costo unitario" id="costo_unitario" required
						><input
							class="remove-arrow input"
							min="0"
							step="0.01"
							{...form.fields.costo_unitario.as('number', data.insumo.costo_unitario)}
						/></FormFieldWrapper
					>
				</div>
				<FormActions cancelHref="/insumos" pending={!!form.pending} submitText="Guardar cambios" />
			</div>
		</form>
	</Can>
</PageLayout>
