<script lang="ts" module>
	export type Option = { value: string; label: string; detalle?: string };
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { FormFieldWrapper } from './';
	import Icono from './Icono.svelte';

	let {
		options = [],
		label,
		field,
		placeholder = 'Seleccionar...',
		onChange = () => {},
		id = '',
		class: className = '',
		allowClear = true,
		onSearch,
		onCreate,
		createLabel = 'Crear nuevo contacto',
		compacto = false,
		...restProps
	}: {
		options: Option[];
		label: string;
		field: {
			value: () => unknown;
			set?: (valor: string) => void;
			as?: (tipo: 'select') => Record<string, unknown>;
		};
		placeholder?: string;
		id: string;
		class?: string;
		allowClear?: boolean;
		onChange?: (val: string) => void;
		onSearch?: (term: string) => Promise<void>;
		onCreate?: (term: string) => void;
		createLabel?: string;
		compacto?: boolean;
		[key: string]: unknown;
	} = $props();

	let searchTerm = $state('');
	let isOpen = $state(false);
	let activeIndex = $state(0);
	let hasTyped = $state(false);
	let selectedOption = $state<Option | null>(null);
	let isSearching = $state(false);
	let searchFailed = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let searchRequestId = 0;
	let listboxId = $derived(`${id}-options`);
	let ancla = $state<HTMLDivElement>();

	function flotante(lista: HTMLElement) {
		const ubicar = () => {
			if (!ancla) return;
			const caja = ancla.getBoundingClientRect();
			const espacioAbajo = window.innerHeight - caja.bottom;
			const haciaArriba = espacioAbajo < 280 && caja.top > espacioAbajo;
			lista.style.left = `${caja.left}px`;
			lista.style.width = `${caja.width}px`;
			lista.style.top = haciaArriba ? 'auto' : `${caja.bottom + 4}px`;
			lista.style.bottom = haciaArriba ? `${window.innerHeight - caja.top + 4}px` : 'auto';
		};
		lista.showPopover();
		ubicar();
		window.addEventListener('scroll', ubicar, true);
		window.addEventListener('resize', ubicar);
		return () => {
			window.removeEventListener('scroll', ubicar, true);
			window.removeEventListener('resize', ubicar);
		};
	}
	let selectedLabel = $derived(
		selectedOption && selectedOption.value === field?.value?.()
			? selectedOption.label
			: (options.find((option) => option.value === field?.value?.())?.label ?? '')
	);
	let filteredOptions = $derived(
		!onSearch && hasTyped && searchTerm
			? options.filter(
					(opt) =>
						opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
						opt.value.toLowerCase().includes(searchTerm.toLowerCase())
				)
			: options
	);

	function buscarRemoto(term: string, debounce: boolean) {
		if (!onSearch) return;
		if (searchTimer) clearTimeout(searchTimer);
		const requestId = ++searchRequestId;
		isSearching = true;
		searchFailed = false;

		const ejecutar = async () => {
			try {
				await onSearch(term);
			} catch {
				if (requestId === searchRequestId) searchFailed = true;
			} finally {
				if (requestId === searchRequestId) isSearching = false;
			}
		};

		if (debounce) searchTimer = setTimeout(() => void ejecutar(), 250);
		else void ejecutar();
	}

	function cancelarBusqueda() {
		searchRequestId += 1;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = undefined;
		isSearching = false;
	}

	onDestroy(cancelarBusqueda);

	function clearSelection() {
		if (field?.set) field.set('');
		selectedOption = null;
		searchTerm = '';
		hasTyped = false;
		isOpen = true;
		buscarRemoto('', false);
		onChange('');
	}

	function openOptions(event?: Event) {
		isOpen = true;
		hasTyped = false;
		searchTerm = selectedLabel;
		buscarRemoto('', false);
		const selectedIndex = options.findIndex((option) => option.value === field?.value?.());
		activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
		if (event?.currentTarget instanceof HTMLInputElement) {
			(event.currentTarget as HTMLInputElement).select();
		}
	}

	function handleInput(event: Event) {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
		hasTyped = true;
		activeIndex = 0;
		isOpen = true;
		buscarRemoto(searchTerm.trim(), true);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!isOpen) {
				isOpen = true;
				activeIndex = 0;
			} else {
				activeIndex = Math.min(activeIndex + 1, Math.max(filteredOptions.length - 1, 0));
			}
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (!isOpen) {
				isOpen = true;
				activeIndex = Math.max(filteredOptions.length - 1, 0);
			} else {
				activeIndex = Math.max(activeIndex - 1, 0);
			}
		} else if (event.key === 'Enter' && isOpen) {
			event.preventDefault();
			const option = filteredOptions[activeIndex];
			if (option) handleSelect(option);
		} else if (event.key === 'Escape' && isOpen) {
			event.preventDefault();
			cancelarBusqueda();
			isOpen = false;
			hasTyped = false;
			searchTerm = selectedLabel;
		}
	}

	function handleSelect(option: { value: string; label: string }) {
		if (field?.set) field.set(option.value);
		selectedOption = option;
		searchTerm = option.label;
		hasTyped = false;
		isOpen = false;
		cancelarBusqueda();
		onChange(option.value);
	}
</script>

<div class={[`relative ${className || ''}`, { 'z-50': isOpen }]}>
	<FormFieldWrapper {label} {id} required={!!restProps.required}>
		<div class="relative" {@attach (nodo) => void (ancla = nodo)}>
			<input
				{id}
				type="text"
				class={['input w-full pr-10', compacto && 'input-sm']}
				{placeholder}
				aria-label={label || placeholder}
				role="combobox"
				aria-autocomplete="list"
				aria-expanded={isOpen}
				aria-controls={listboxId}
				aria-activedescendant={isOpen && filteredOptions[activeIndex]
					? `${listboxId}-option-${activeIndex}`
					: undefined}
				value={isOpen ? searchTerm : selectedLabel}
				onfocus={openOptions}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onblur={() => (isOpen = false)}
				{...restProps}
			/>
			{#if allowClear && (searchTerm || selectedLabel)}
				<button
					type="button"
					class="btn absolute top-1/2 right-2 btn-circle -translate-y-1/2 btn-ghost btn-xs"
					aria-label="Limpiar búsqueda"
					onmousedown={(event) => event.preventDefault()}
					onclick={clearSelection}
				>
					<Icono nombre="cerrar" class="size-3.5" />
				</button>
			{/if}
		</div>
	</FormFieldWrapper>

	{#if field?.as}
		<select {...field.as('select')} class="hidden">
			<option value="">Seleccionar...</option>
			{#if selectedOption && selectedOption.value === field?.value?.() && !options.some((option) => option.value === selectedOption?.value)}
				<option value={selectedOption.value}>{selectedOption.label}</option>
			{/if}
			{#each options as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{/if}

	{#if isOpen}
		<div
			popover="manual"
			{@attach flotante}
			class="fixed m-0 overflow-hidden rounded-box border border-base-300 bg-base-100 p-0 text-base-content shadow-lg"
		>
			{#if isSearching}
				<div role="status" class="px-3 py-2 text-sm text-base-content/60">Buscando...</div>
			{:else if searchFailed}
				<div role="status" class="px-3 py-2 text-sm text-error">
					No se pudo completar la búsqueda
				</div>
			{:else if filteredOptions.length}
				<div id={listboxId} role="listbox" class="max-h-64 overflow-auto p-1">
					{#each filteredOptions as opt, index (opt.value)}
						<button
							type="button"
							id={`${listboxId}-option-${index}`}
							role="option"
							aria-selected={opt.value === field?.value?.()}
							tabindex="-1"
							class={[
								'w-full rounded-field px-3 py-1.5 text-left text-sm hover:bg-base-200',
								{ 'bg-base-200': index === activeIndex }
							]}
							onmousedown={(event) => event.preventDefault()}
							onclick={() => handleSelect(opt)}
						>
							{opt.label}
							{#if opt.detalle}<span class="secundario block">{opt.detalle}</span>{/if}
						</button>
					{/each}
				</div>
			{:else}
				<p class="px-3 py-2 text-sm text-base-content/60">No hay resultados</p>
			{/if}

			{#if onCreate}
				<button
					type="button"
					class="flex w-full items-center gap-2 border-t border-base-300 px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-base-200"
					onmousedown={(event) => event.preventDefault()}
					onclick={() => onCreate?.(searchTerm.trim())}
				>
					<span aria-hidden="true">+</span>
					{searchTerm.trim() && hasTyped ? `${createLabel}: “${searchTerm.trim()}”` : createLabel}
				</button>
			{/if}
		</div>
	{/if}
</div>
