export interface DebounceCallback {
	(): void;
}

let debounceTimer: number | undefined;

export const debounce = (callback: DebounceCallback, wait = 500) => {
	if (debounceTimer) window.clearTimeout(debounceTimer);
	debounceTimer = window.setTimeout(() => callback(), wait);
};
