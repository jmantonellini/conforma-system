<script lang="ts">
	import { paises, provincias } from '$lib/data/direcciones';
	import FormField from './FormField.svelte';

	let { form, initialData, disabled = false } = $props();

	function onPaisChange() {
		// Resetear provincia y ciudad al cambiar país
		if (form.fields.pais?.value() !== 'Argentina') {
			form.fields.provincia = '';
			form.fields.ciudad = '';
		}
	}

	function onProvinciaChange() {
		// Resetear ciudad al cambiar provincia
		form.fields.ciudad = '';
	}
</script>

<fieldset class="fieldset rounded-lg border p-4">
	<legend class="text-md fieldset-legend px-2 font-semibold">Dirección</legend>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- País (select) -->
		<div class="flex w-full flex-col gap-2">
			<label class="label" for="pais"> País </label>
			<select
				class="select-bordered select w-full"
				id="pais"
				{...form.fields?.pais?.as('text', initialData?.pais || 'Argentina')}
				onchange={onPaisChange}
				{disabled}
			>
				{#each paises as pais (pais)}
					<option value={pais}>{pais}</option>
				{/each}
			</select>
		</div>

		{#if form.fields?.pais?.value() === 'Argentina'}
			<!-- Provincia (select) -->
			<div class="flex w-full flex-col gap-2">
				<label class="label" for="provincia"> Provincia </label>
				<select
					id="provincia"
					class="select"
					class:select-disabled={disabled}
					{...form.fields?.provincia?.as('text', initialData?.provincia || '')}
					onchange={onProvinciaChange}
					{disabled}
				>
					<option value="">Seleccionar provincia...</option>
					{#each provincias as provincia (provincia)}
						<option value={provincia}>{provincia}</option>
					{/each}
				</select>
			</div>
		{:else}
			<!-- Para otros países, campos de texto libre -->
			<div class="md:col-span-2">
				<FormField
					label="Provincia / Estado"
					{...form.fields?.provincia?.as('text', initialData?.provincia || '')}
					{disabled}
				/>
			</div>
		{/if}

		<!-- Ciudad -->
		<FormField label="Ciudad" {...form.fields?.ciudad?.as('text', initialData?.ciudad || '')} />

		<!-- Código Postal -->
		<FormField
			label="Código Postal"
			{...form.fields?.codigo_postal?.as('text', initialData?.codigo_postal || '')}
			{disabled}
		/>

		<!-- Calle -->
		<FormField
			label="Calle"
			{...form.fields?.calle?.as('text', initialData?.calle || '')}
			{disabled}
		/>

		<!-- Número, Piso, Departamento -->
		<div class="grid grid-cols-3 gap-4 md:col-span-2">
			<FormField
				label="Número"
				{...form.fields?.numero?.as('text', initialData?.numero || '')}
				{disabled}
			/>
			<FormField
				label="Piso"
				{...form.fields?.piso?.as('text', initialData?.piso || '')}
				{disabled}
			/>
			<FormField
				label="Departamento"
				{...form.fields?.departamento?.as('text', initialData?.departamento || '')}
				{disabled}
			/>
		</div>
	</div>
</fieldset>
