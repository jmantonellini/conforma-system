<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FormFieldWrapper } from '$lib/components/ui';
	import { register } from '$lib/remote/auth.remote';
	import { toast } from '$lib/stores/toast.svelte';

	const form = register;
</script>

<div class="flex min-h-screen items-center justify-center">
	<form
		{...form.enhance(async (form) => {
			try {
				if (await form.submit()) {
					form.element.reset();
					toast.success('Usuario registrado!');
					goto(resolve('/login'));
				} else {
					toast.error('Error de validación');
				}
			} catch (error) {
				console.log(error);
				toast.error('Error del servidor');
			}
		})}
	>
		<fieldset class="fieldset w-xs rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Register</legend>

			<FormFieldWrapper id="email" label="Email">
				<input
					type="text"
					{...form.fields.username.as('text')}
					placeholder="Usuario"
					class="input-bordered input"
				/>
				{#each form.fields.username.issues() as issue (issue)}
					<p class="text-sm text-error">{issue.message}</p>
				{/each}
			</FormFieldWrapper>

			<FormFieldWrapper id="password" label="Password">
				<input
					{...form.fields.password.as('password')}
					placeholder="Contraseña"
					class="input-bordered input"
					autocomplete="current-password webauthn"
				/>
				{#each form.fields.password.issues() as issue (issue)}
					<p class="text-sm text-error">{issue.message}</p>
				{/each}
			</FormFieldWrapper>

			<button class="btn mt-4 btn-neutral" type="submit" disabled={!!form.pending}>
				{form.pending ? 'Registrando...' : 'Registrar'}
			</button>
		</fieldset>
	</form>
</div>
