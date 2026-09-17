<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
</script>

{#if toast.toasts.length > 0}
	<div class="toast toast-center toast-top z-20">
		{#each toast.toasts as t (t.id)}
			<div class="alert alert-{t.type} min-w-72 alert-soft shadow-md">
				<span class="status status-{t.type}" aria-hidden="true"></span>
				<span class="flex-1 text-sm">{t.message}</span>
				<button
					class="btn btn-circle btn-ghost btn-xs"
					aria-label="Cerrar notificación"
					onclick={() => toast.remove(t.id)}>×</button
				>
			</div>
		{/each}
	</div>
{/if}
