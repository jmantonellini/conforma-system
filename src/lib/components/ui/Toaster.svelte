<script lang="ts">
	import { toast, type ToastType } from '$lib/toast/toast.svelte';

	const icons: Record<ToastType, string> = {
		info: 'ℹ️',
		success: '✅',
		error: '❌',
		warning: '⚠️'
	};
</script>

{#if toast.toasts.length > 0}
	<div class="toast z-20 toast-end toast-bottom">
		{#each toast.toasts as t (t.id)}
			<button
				class="alert alert-{t.type} cursor-pointer shadow-lg"
				onclick={() => toast.remove(t.id)}
			>
				<span class="text-xl">{icons[t.type]}</span>
				<span class="flex-1 text-sm">{t.message}</span>
			</button>
		{/each}
	</div>
{/if}
