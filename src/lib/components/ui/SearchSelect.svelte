<script lang="ts">
	import { FormFieldWrapper } from '.';

	let {
		options = [],
		label,
		field,
		placeholder = 'Seleccionar...',
		onChange = () => {},
		id = '',
		class: className = '',
		allowClear = true,
		...restProps
	}: {
		options: { value: string; label: string }[];
		label: string;
		field: any;
		placeholder?: string;
		id: string;
		class?: string;
		allowClear?: boolean;
		onChange?: (val: string) => void;
		[key: string]: any;
	} = $props();

	let searchTerm = $state('');
	let isOpen = $state(false);
	let activeIndex = $state(0);
	let hasTyped = $state(false);
	let listboxId = $derived(`${id}-options`);
	let selectedLabel = $derived(
		options.find((option) => option.value === field?.value?.())?.label ?? ''
	);
	let filteredOptions = $derived(
		hasTyped && searchTerm
			? options.filter(
					(opt) =>
						opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
						opt.value.toLowerCase().includes(searchTerm.toLowerCase())
				)
			: options
	);

	function clearSelection() {
		if (field?.set) field.set('');
		searchTerm = '';
		hasTyped = false;
		isOpen = true;
		onChange('');
	}

	function openOptions(event: FocusEvent) {
		isOpen = true;
		hasTyped = false;
		searchTerm = selectedLabel;
		const selectedIndex = options.findIndex((option) => option.value === field?.value?.());
		activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
		(event.currentTarget as HTMLInputElement).select();
	}

	function handleInput(event: Event) {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
		hasTyped = true;
		activeIndex = 0;
		isOpen = true;
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
			isOpen = false;
			hasTyped = false;
			searchTerm = selectedLabel;
		}
	}

	function handleSelect(option: { value: string; label: string }) {
		if (field?.set) field.set(option.value);
		searchTerm = option.label;
		hasTyped = false;
		isOpen = false;
		onChange(option.value);
	}
</script>

<div class="relative {className || ''}">
	<FormFieldWrapper {label} {id}>
		<div class="relative">
			<input
				{id}
				type="text"
				class="input w-full pr-10"
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
					✕
				</button>
			{/if}
		</div>
	</FormFieldWrapper>

	{#if field?.as}
		<select {...field.as('select')} class="hidden">
			<option value="">Seleccionar...</option>
			{#each options as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{/if}

	{#if isOpen && filteredOptions.length}
		<div
			id={listboxId}
			role="listbox"
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-base-300 bg-base-100 shadow-lg"
		>
			{#each filteredOptions as opt, index (opt.value)}
				<button
					type="button"
					id={`${listboxId}-option-${index}`}
					role="option"
					aria-selected={opt.value === field?.value?.()}
					tabindex="-1"
					class="w-full px-4 py-2 text-left hover:bg-base-200"
					class:bg-base-200={index === activeIndex}
					onmousedown={(event) => event.preventDefault()}
					onclick={() => handleSelect(opt)}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	{:else if isOpen && !filteredOptions.length}
		<div
			role="status"
			class="absolute z-10 mt-1 w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content/70 shadow-lg"
		>
			No hay resultados
		</div>
	{/if}
</div>
