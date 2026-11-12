<script lang="ts">
	import Modal from './Modal.svelte';
	import { confirmacion } from '$lib/ui/confirmar.svelte';
</script>

<Modal
	open={confirmacion.pedido !== null}
	ancho="sm"
	titulo={confirmacion.pedido?.titulo ?? 'Confirmar'}
	alCerrar={() => confirmacion.responder(false)}
	accion={{
		etiqueta: confirmacion.pedido?.accion ?? 'Confirmar',
		peligro: confirmacion.pedido?.peligro,
		onclick: () => confirmacion.responder(true)
	}}
>
	<p class="text-sm text-base-content/80">{confirmacion.pedido?.mensaje}</p>
</Modal>
