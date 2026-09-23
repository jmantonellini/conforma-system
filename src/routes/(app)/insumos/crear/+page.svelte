<script lang="ts">
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
</script>

<PageLayout>
	<a href={resolve('/insumos')} class="btn btn-ghost btn-sm">← Volver</a>
	<Can modulo="insumos" accion="create">
		<form
			{...form.enhance(async (instance) => {
				try {
					if (await instance.submit()) {
						toast.success('Insumo creado');
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
			<FormActions cancelHref="/insumos" pending={!!form.pending} submitText="Crear insumo" />
		</form>
	</Can>
</PageLayout>
