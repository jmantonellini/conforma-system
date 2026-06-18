<!-- src/routes/login/+page.svelte -->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { login } from '$lib/remote/auth.remote';
	import { toast } from '$lib/stores/toast.svelte';

	const form = login;
</script>

<div class="flex min-h-screen items-center justify-center">
	<form
		{...form.enhance(async (form) => {
			try {
				if (await form.submit()) {
					form.element.reset();

					toast.success('Bienvenido!');
					invalidateAll();
					goto(resolve('/'));
				} else {
					toast.error('Error de validación');
				}
			} catch (error) {
				console.log(error);
				toast.error('Error del servidor');
			}
		})}
		class="card w-96 bg-base-100 shadow-xl"
	>
		<div class="card-body">
			<h2 class="card-title">Iniciar Sesión</h2>

			<input
				type="text"
				{...form.fields.username.as('text')}
				placeholder="Usuario"
				class="input-bordered input"
			/>

			<input
				{...form.fields.password.as('password')}
				placeholder="Contraseña"
				class="input-bordered input"
				autocomplete="current-password webauthn"
			/>

			{#each form.fields.username.issues() as issue (issue)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
			{#each form.fields.password.issues() as issue (issue)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}

			<button class="btn btn-primary" type="submit" disabled={!!form.pending}>
				{form.pending ? 'Ingresando...' : 'Ingresar'}
			</button>
		</div>
	</form>
</div>
