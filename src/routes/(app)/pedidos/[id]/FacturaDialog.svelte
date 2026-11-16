<script lang="ts">
	import { FormErrors, FormFieldWrapper, Modal } from '$lib/ui';
	import { cambiarFactura } from '$lib/modulos/pedidos/facturacion.remote';
	import { toast } from '$lib/ui/toast.svelte';

	let { pedidoId, factura }: { pedidoId: number; factura: string | null } = $props();

	let abierto = $state(false);
	const form = cambiarFactura;

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
	titulo="Factura del pedido"
	alCerrar={cerrar}
	accion={{ etiqueta: 'Guardar', form: 'factura-form', pendiente: !!form.pending }}
>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				toast.success('Factura guardada');
				cerrar();
			}
		})}
		id="factura-form"
	>
		<input type="hidden" name="pedido_id" value={pedidoId} />
		<FormFieldWrapper
			label="Número de factura"
			id="factura"
			ayuda="Código del comprobante en el sistema de facturación. Dejalo vacío para quitarla."
		>
			<input
				id="factura"
				class="input w-full"
				maxlength="100"
				placeholder="Ej: A-0001-00001234"
				{...form.fields.factura.as('text', factura ?? '')}
			/>
		</FormFieldWrapper>
		<FormErrors {form} />
	</form>
</Modal>
