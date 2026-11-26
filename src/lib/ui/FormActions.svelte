<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	let {
		cancelHref,
		onCancel,
		pending = false,
		pendingText = 'Guardando...',
		submitText = 'Guardar',
		onSubmit,
		formulario
	}: {
		cancelHref?: ResolvedPathname;
		onCancel?: () => void;
		pending?: boolean;
		pendingText?: string;
		submitText?: string;
		onSubmit?: () => void;
		formulario?: string;
	} = $props();
</script>

<div class="flex justify-end gap-3">
	{#if cancelHref}
		<a href={cancelHref} onclick={onCancel} class="btn btn-outline btn-sm">Cancelar</a>
	{:else}
		<button type="button" class="btn btn-outline btn-sm" disabled={pending} onclick={onCancel}>
			Cancelar
		</button>
	{/if}
	<button
		type={onSubmit ? 'button' : 'submit'}
		form={formulario}
		class="btn btn-primary btn-sm"
		disabled={pending}
		onclick={onSubmit}
	>
		{pending ? pendingText : submitText}
	</button>
</div>
