<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	let {
		cancelHref,
		onCancel,
		pending = false,
		pendingText = 'Guardando...',
		submitText = 'Guardar'
	}: {
		cancelHref: ResolvedPathname;
		onCancel?: () => void;
		pending?: boolean;
		pendingText?: string;
		submitText?: string;
	} = $props();
</script>

<div class="flex justify-end gap-3">
	<a href={cancelHref} onclick={onCancel} class="btn btn-outline btn-sm">Cancelar</a>
	<button type="submit" class="btn btn-primary btn-sm" disabled={pending}>
		{pending ? pendingText : submitText}
	</button>
</div>
