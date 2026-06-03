<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		cancelHref,
		pending = false,
		pendingText = 'Guardando...',
		submitText = 'Guardar'
	} = $props<{
		cancelHref: string;
		pending?: boolean;
		pendingText?: string;
		submitText?: string;
	}>();
</script>

<div class="flex justify-end gap-3">
	<a href={resolve(cancelHref)} class="btn btn-outline">Cancelar</a>
	<button type="submit" class="btn btn-primary" disabled={pending}>
		{pending ? pendingText : submitText}
	</button>
</div>
