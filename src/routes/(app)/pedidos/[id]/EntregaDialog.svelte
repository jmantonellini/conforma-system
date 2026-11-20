<script lang="ts">
	import { page } from '$app/state';
	import { FormErrors, Modal } from '$lib/ui';
	import { guardarEntregaPedido } from '$lib/modulos/pedidos/entrega.remote';
	import CamposEntrega from '$lib/modulos/pedidos/componentes/CamposEntrega.svelte';
	import type { DatosEntrega, OrigenEntrega } from '$lib/modulos/ventas/trabajo';
	import { toast } from '$lib/ui/toast.svelte';
	import { can } from '$lib/utils/permissions';

	let {
		pedidoId,
		entrega,
		origen
	}: { pedidoId: number; entrega: DatosEntrega; origen: OrigenEntrega } = $props();

	let abierto = $state(false);
	const form = $derived(guardarEntregaPedido.for(String(pedidoId)));
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
		{#if abierto}
			<CamposEntrega prefijo="pedido-entrega" campos={form.fields as never} inicial={entrega} />
		{/if}
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
