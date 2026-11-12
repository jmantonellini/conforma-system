<script lang="ts">
	import { toast } from '$lib/ui/toast.svelte';

	function alFrente(contenedor: HTMLElement) {
		if (!toast.toasts.length) return;
		if (contenedor.matches(':popover-open')) contenedor.hidePopover();
		contenedor.showPopover();
	}
</script>

{#if toast.toasts.length > 0}
	<div
		popover="manual"
		class="fixed top-auto right-4 bottom-4 left-auto m-0 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 overflow-visible border-0 bg-transparent p-0"
		aria-live="polite"
		{@attach (contenedor) => {
			void toast.toasts.length;
			alFrente(contenedor);
		}}
	>
		{#each toast.toasts as t (t.id)}
			<div
				class="alert alert-{t.type} w-80 max-w-full cursor-pointer alert-soft shadow-lg"
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
