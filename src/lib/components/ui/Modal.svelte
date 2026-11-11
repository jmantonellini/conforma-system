<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scale } from 'svelte/transition';

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

	function showDialog(dialog: HTMLDialogElement) {
		if (!dialog.open) dialog.showModal();
	}

	function handleClose() {
		const wasOpen = open;
		open = false;
		if (wasOpen) onClose?.();
	}
</script>

{#if open}
	<dialog
		{@attach showDialog}
		class="modal modal-bottom sm:modal-middle"
		onclose={handleClose}
		oncancel={handleClose}
	>
		<div
			class="modal-box flex max-h-[85vh] flex-col p-0 shadow-xl"
			transition:scale={{ start: 0.97, duration: 150 }}
		>
			<header class="flex items-center justify-between gap-4 border-b border-base-300 px-5 py-3.5">
				<h3 class="font-semibold">{title}</h3>
				<button
					type="button"
					class="btn btn-square btn-ghost btn-sm"
					aria-label="Cerrar"
					onclick={handleClose}
				>
					<svg
						viewBox="0 0 24 24"
						class="size-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
					</svg>
				</button>
			</header>

			<div class="overflow-y-auto px-5 py-4">{@render children()}</div>

			<footer class="flex justify-end gap-2 border-t border-base-300 bg-base-200/50 px-5 py-3">
				{#if actions}
					{@render actions()}
				{:else}
					<button class="btn btn-sm" onclick={handleClose}>Cerrar</button>
				{/if}
			</footer>
		</div>
		<form method="dialog" class="modal-backdrop bg-base-content/25 backdrop-blur-[2px]">
			<button onclick={handleClose}>Cerrar</button>
		</form>
	</dialog>
{/if}
