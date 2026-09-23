<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
</script>

{#if toast.toasts.length > 0}
	<div class="toast toast-center toast-top z-20">
		{#each toast.toasts as t (t.id)}
			<div
				class="alert alert-{t.type} min-w-72 cursor-pointer alert-soft shadow-md"
				onclick={() => toast.remove(t.id)}
				role="button"
				tabindex="0"
				onkeydown={(event) => event.key === 'Enter' && toast.remove(t.id)}
			>
				<span class="status status-{t.type}" aria-hidden="true"></span>
				<span class="flex-1 text-sm">{t.message}</span>
			</div>
		{/each}
	</div>
{/if}
