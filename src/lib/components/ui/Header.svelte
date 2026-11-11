<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Logo from '$lib/assets/Logo.png';
	import { enviarFeedback, logout } from '$lib/remote/auth.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';
	import CampanaNotificaciones from './CampanaNotificaciones.svelte';
	import FormFieldWrapper from './FormFieldWrapper.svelte';
	import Modal from './Modal.svelte';
	let { session } = $props();
	let modalOpen = $state(false);
	let form = enviarFeedback;

	function openModal() {
		modalOpen = true;
	}
	function closeModal() {
		modalOpen = false;
	}

	async function handleLogout() {
		const result = await logout();
		if (result.success) {
			logout();
			goto(resolve(Paths.LOGIN));
		}
	}
</script>

<header class="navbar sticky top-0 z-40 border-b border-base-300 bg-base-100 px-4 sm:px-6">
	<div class="navbar-start h-auto">
		<img src={Logo} alt="Conforma Logo" class="h-8 w-auto" />
	</div>
	<div class="navbar-end gap-2">
		<button class="btn hidden btn-ghost btn-sm sm:inline-flex" onclick={() => openModal()}
			>Feedback</button
		>
		<CampanaNotificaciones />
		{#if session}
			<!-- <span>Bienvenido, {data.session?.username} ({data.session.rol})</span> -->
			<button onclick={handleLogout} class="btn btn-ghost btn-sm" type="submit"
				>Cerrar sesión</button
			>
		{/if}
	</div>
</header>

<Modal bind:open={modalOpen} title="Sugerencias y errores" onClose={closeModal}>
	<form
		id="feedback-form"
		{...form.enhance(async (form) => {
			try {
				if (await form.submit()) {
					closeModal();
					form.element?.reset();
					toast.success('Feedback enviado!');
				} else {
					toast.error('Error al enviar el feedback');
				}
			} catch (error) {
				console.log(error);
				toast.error('Error al enviar el feedback');
			}
		})}
	>
		<div class="py-4">
			<p>Envía una sugerencia o reporta un error. <br />El mensaje es absolutamente anónimo.</p>
		</div>
		<FormFieldWrapper id="mensaje" label="Mensaje" required>
			<textarea class="textarea w-full resize-none" rows="5" {...form.fields.mensaje.as('text')}>
			</textarea>
		</FormFieldWrapper>
	</form>
	{#snippet actions()}
		<button class="btn" onclick={closeModal}>Cerrar</button>
		<button type="submit" class="btn btn-primary" form="feedback-form">
			{form.pending ? 'Enviando...' : 'Enviar'}
		</button>
	{/snippet}
</Modal>
