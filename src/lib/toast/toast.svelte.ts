// src/lib/stores/toast.svelte.ts
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
	id: symbol;
	type: ToastType;
	message: string;
	duration: number;
}

class ToastStore {
	toasts = $state<Toast[]>([]);
	private timeouts = new Map<symbol, NodeJS.Timeout>();

	private add(type: ToastType, message: string, duration: number) {
		const id = Symbol();
		const newToast: Toast = { id, type, message, duration };

		this.toasts = [...this.toasts, newToast];

		const timeout = setTimeout(() => this.remove(id), duration);
		this.timeouts.set(id, timeout);
	}

	remove(id: symbol) {
		const timeout = this.timeouts.get(id);
		if (timeout) {
			clearTimeout(timeout);
			this.timeouts.delete(id);
		}
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clearAll() {
		for (const [_, timeout] of this.timeouts) clearTimeout(timeout);
		this.timeouts.clear();
		this.toasts = [];
	}

	info(message: string, duration = 3000) {
		this.add('info', message, duration);
	}
	success(message: string, duration = 3000) {
		this.add('success', message, duration);
	}
	error(message: string, duration = 5000) {
		this.add('error', message, duration);
	}
	warning(message: string, duration = 4000) {
		this.add('warning', message, duration);
	}
}

export const toast = new ToastStore();
