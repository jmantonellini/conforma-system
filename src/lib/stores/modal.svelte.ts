import type { Snippet } from 'svelte';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalContext {
	title: string;
	content: Snippet;
	actions?: Snippet;
	size?: ModalSize;
	onClose?: () => void;
}

class ModalStore {
	open = $state(false);
	title = $state('');
	content = $state<Snippet | null>(null);
	actions = $state<Snippet | null>(null);
	size = $state<ModalSize>('md');
	onClose = $state<(() => void) | null>(null);

	openModal(context: ModalContext) {
		this.open = true;
		this.title = context.title;
		this.content = context.content;
		this.actions = context.actions || null;
		this.size = context.size || 'md';
		this.onClose = context.onClose || null;
	}

	close() {
		this.open = false;
		// Limpieza después de la animación (opcional)
		setTimeout(() => {
			if (!this.open) {
				this.content = null;
				this.actions = null;
				this.onClose = null;
			}
		}, 200);
	}
}

export const modal = new ModalStore();
