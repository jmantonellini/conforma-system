<script lang="ts">
	import { FormFieldWrapper } from '$lib/ui';
	import { getNombresTransportistas } from '$lib/modulos/pedidos/entrega.remote';

	type Campo = { as: (tipo: 'text', inicial: string) => Record<string, unknown> };
	type Inicial = {
		entrega_transportista?: string | null;
		entrega_direccion?: string | null;
		entrega_localidad?: string | null;
		entrega_recibe?: string | null;
		entrega_telefono?: string | null;
	};

	let {
		campos,
		inicial,
		disabled = false
	}: {
		campos: {
			entrega_transportista: Campo;
			entrega_direccion: Campo;
			entrega_localidad: Campo;
			entrega_recibe: Campo;
			entrega_telefono: Campo;
		};
		inicial?: Inicial;
		disabled?: boolean;
	} = $props();

	const transportistas = $derived(await getNombresTransportistas());
</script>

<fieldset class="fieldset seccion">
	<legend class="fieldset-legend">Datos de entrega</legend>
	<p class="secundario -mt-1 mb-2">
		Se copian a cada pedido nuevo para despachar apenas esté terminado.
	</p>
	<div class="grid gap-4 md:grid-cols-2">
		<FormFieldWrapper
			id="entrega_transportista"
			label="Transportista preferido"
			ayuda="Elegí uno de la lista o escribí uno nuevo."
		>
			<input
				id="entrega_transportista"
				class="input"
				list="transportistas-contacto"
				autocomplete="off"
				placeholder="Ej: Vía Cargo"
				{disabled}
				{...campos.entrega_transportista.as('text', inicial?.entrega_transportista ?? '')}
			/>
			<datalist id="transportistas-contacto">
				{#each transportistas as nombre (nombre)}
					<option value={nombre}></option>
				{/each}
			</datalist>
		</FormFieldWrapper>
		<FormFieldWrapper id="entrega_localidad" label="Localidad de destino">
			<input
				id="entrega_localidad"
				class="input"
				placeholder="Ciudad, provincia"
				{disabled}
				{...campos.entrega_localidad.as('text', inicial?.entrega_localidad ?? '')}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper
			id="entrega_direccion"
			label="Dirección o sucursal de destino"
			class="md:col-span-2"
		>
			<input
				id="entrega_direccion"
				class="input"
				placeholder="Si es distinta a la dirección del contacto, o la terminal / sucursal"
				{disabled}
				{...campos.entrega_direccion.as('text', inicial?.entrega_direccion ?? '')}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper id="entrega_recibe" label="Quién recibe">
			<input
				id="entrega_recibe"
				class="input"
				placeholder="Nombre y DNI"
				{disabled}
				{...campos.entrega_recibe.as('text', inicial?.entrega_recibe ?? '')}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper id="entrega_telefono" label="Teléfono de quien recibe">
			<input
				id="entrega_telefono"
				class="input"
				{disabled}
				{...campos.entrega_telefono.as('text', inicial?.entrega_telefono ?? '')}
			/>
		</FormFieldWrapper>
	</div>
</fieldset>
