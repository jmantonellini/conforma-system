<script lang="ts">
	import Modal from './Modal.svelte';
	import { confirmacion } from '$lib/stores/confirmacion.svelte';
</script>

<Modal
	open={confirmacion.pedido !== null}
	title={confirmacion.pedido?.titulo}
	onClose={() => confirmacion.responder(false)}
>
	<p class="text-base-content/80">{confirmacion.pedido?.mensaje}</p>
	{#snippet actions()}
		<button class="btn btn-sm" onclick={() => confirmacion.responder(false)}>Cancelar</button>
		<button
			class={['btn btn-sm', confirmacion.pedido?.peligro ? 'btn-error' : 'btn-primary']}
			onclick={() => confirmacion.responder(true)}
		>
			{confirmacion.pedido?.accion ?? 'Confirmar'}
		</button>
	{/snippet}
</Modal>
