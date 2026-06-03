<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	let {
		open = $bindable(),
		title,
		children,
		actions,
		onClose
	}: {
		open?: boolean;
		title?: string;
		children: Snippet;
		actions?: Snippet;
		onClose?: () => void;
	} = $props();

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

{#if open}
	<dialog class="modal" open>
		<div class="modal-box" transition:fly={{ y: 20, duration: 200 }}>
			{#if title}
				<h3 class="mb-4 text-lg font-bold">{title}</h3>
			{/if}

			{@render children()}

			<div class="modal-action">
				{#if actions}
					{@render actions()}
				{:else}
					<button class="btn" onclick={handleClose}>Cerrar</button>
				{/if}
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={handleClose}>close</button>
		</form>
	</dialog>
{/if}
