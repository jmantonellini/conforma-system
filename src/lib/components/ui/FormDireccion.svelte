<script lang="ts">
	import { paises, provincias } from '$lib/data/direcciones';
	import FormFieldWrapper from './FormFieldWrapper.svelte';

	let { form, initialData, disabled = false } = $props();

	function onPaisChange() {
		if (form.fields.pais?.value() !== 'Argentina') {
			form.fields.provincia = '';
			form.fields.ciudad = '';
		}
	}

	function onProvinciaChange() {
		form.fields.ciudad = '';
	}
</script>

<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
	<legend class="fieldset-legend">Dirección</legend>

	<div class="grid gap-4 md:grid-cols-3">
		<!-- País (select) -->
		<div class="flex w-full flex-col gap-2">
			<label class="label" for="pais"> País </label>
			<select
				class="select w-full"
				id="pais"
				{...form.fields?.pais?.as('select', initialData?.pais || 'Argentina')}
				onchange={onPaisChange}
				{disabled}
			>
				{#each paises as pais (pais)}
					<option value={pais}>{pais}</option>
				{/each}
			</select>
		</div>

		<!-- Para otros países, campos de texto libre -->
		<FormFieldWrapper id="provincia" label="Provincia">
			<select
				id="provincia"
				class="select"
				class:select-disabled={disabled}
				{...form.fields?.provincia?.as('select', initialData?.provincia || '')}
				onchange={onProvinciaChange}
				{disabled}
			>
				<option value={0}>Seleccionar provincia...</option>
				{#each provincias as provincia (provincia)}
					<option value={provincia}>{provincia}</option>
				{/each}
			</select>
		</FormFieldWrapper>

		<!-- Ciudad -->
		<FormFieldWrapper id="ciudad" label="Ciudad">
			<input
				class="input"
				{...form.fields?.ciudad?.as('text', initialData?.ciudad || '')}
				{disabled}
			/>
		</FormFieldWrapper>

		<!-- Código Postal -->
		<FormFieldWrapper id="codigo_postal" label="Código Postal">
			<input
				class="input"
				{...form.fields?.codigo_postal?.as('text', initialData?.codigo_postal || '')}
				{disabled}
			/>
		</FormFieldWrapper>

		<!-- Calle -->
		<FormFieldWrapper id="calle" label="Calle">
			<input
				class="input"
				{...form.fields?.calle?.as('text', initialData?.calle || '')}
				{disabled}
			/>
		</FormFieldWrapper>

		<!-- Número, Piso, Departamento -->
		<FormFieldWrapper id="numero" label="Número">
			<input
				class="input"
				{...form.fields?.numero?.as('text', initialData?.numero || '')}
				{disabled}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper id="piso" label="Piso">
			<input class="input" {...form.fields?.piso?.as('text', initialData?.piso || '')} {disabled} />
		</FormFieldWrapper>
		<FormFieldWrapper id="departamento" label="Departamento">
			<input
				class="input"
				{...form.fields?.departamento?.as('text', initialData?.departamento || '')}
				{disabled}
			/>
		</FormFieldWrapper>
	</div>
</fieldset>
