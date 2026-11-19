<script lang="ts">
	import { page } from '$app/state';
	import { FormErrors, FormFieldWrapper, Modal } from '$lib/ui';
	import {
		getNombresTransportistas,
		guardarEntregaPedido
	} from '$lib/modulos/pedidos/entrega.remote';
	import type { DatosEntrega, OrigenEntrega } from '$lib/modulos/ventas/trabajo';
	import { toast } from '$lib/ui/toast.svelte';
	import { can } from '$lib/utils/permissions';

	let {
		pedidoId,
		entrega,
		origen
	}: { pedidoId: number; entrega: DatosEntrega; origen: OrigenEntrega } = $props();

	let abierto = $state(false);
	const form = guardarEntregaPedido;
	const transportistas = $derived(await getNombresTransportistas());
	const editaContacto = can(page.data.user, page.data.permisos, 'contactos', 'edit');

	export function abrir() {
		abierto = true;
	}

	function cerrar() {
		abierto = false;
		form.element?.reset();
	}
</script>

<Modal
	bind:open={abierto}
	titulo="Datos de entrega"
	alCerrar={cerrar}
	accion={{ etiqueta: 'Guardar', form: 'entrega-form', pendiente: !!form.pending }}
>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				toast.success('Datos de entrega guardados');
				cerrar();
			}
		})}
		id="entrega-form"
		class="flex flex-col gap-4"
	>
		<input type="hidden" name="pedido_id" value={pedidoId} />
		<FormFieldWrapper
			label="Transportista"
			id="entrega-transportista"
			ayuda="Elegí uno de la lista o escribí uno nuevo."
		>
			<input
				id="entrega-transportista"
				class="input w-full"
				list="entrega-transportistas"
				autocomplete="off"
				placeholder="Ej: Vía Cargo"
				{...form.fields.transportista.as('text', entrega.transportista ?? '')}
			/>
			<datalist id="entrega-transportistas">
				{#each transportistas as nombre (nombre)}
					<option value={nombre}></option>
				{/each}
			</datalist>
		</FormFieldWrapper>
		<div class="grid gap-4 sm:grid-cols-2">
			<FormFieldWrapper label="Localidad de destino" id="entrega-localidad">
				<input
					id="entrega-localidad"
					class="input w-full"
					placeholder="Ciudad, provincia"
					{...form.fields.localidad.as('text', entrega.localidad ?? '')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper label="Dirección o sucursal" id="entrega-direccion">
				<input
					id="entrega-direccion"
					class="input w-full"
					placeholder="Terminal, sucursal o domicilio"
					{...form.fields.direccion.as('text', entrega.direccion ?? '')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper label="Quién recibe" id="entrega-recibe">
				<input
					id="entrega-recibe"
					class="input w-full"
					placeholder="Nombre y DNI"
					{...form.fields.recibe.as('text', entrega.recibe ?? '')}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper label="Teléfono" id="entrega-telefono">
				<input
					id="entrega-telefono"
					class="input w-full"
					{...form.fields.telefono.as('text', entrega.telefono ?? '')}
				/>
			</FormFieldWrapper>
		</div>
		{#if editaContacto}
			<label class="label cursor-pointer justify-start gap-3 text-sm">
				<input
					class="checkbox checkbox-sm checkbox-primary"
					{...form.fields.guardar_en_contacto.as('checkbox', origen !== 'pedido')}
				/>
				Guardar también en el contacto para los próximos pedidos
			</label>
		{/if}
		<FormErrors {form} />
	</form>
</Modal>
