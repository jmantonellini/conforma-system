<!-- src/lib/components/ui/SearchSelect.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import FormField from './FormField.svelte';

	let {
		options = [],
		placeholder = 'Seleccionar...',
		value = $bindable(''),
		label = '',
		disabled = false,
		required = false,
		id = '',
		onChange = () => {}
	} = $props<{
		options: Array<{ value: string; label: string }>;
		placeholder?: string;
		value: string;
		label?: string;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		onChange?: (value: string) => void;
	}>();

	let searchTerm = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $derived(-1);
	let inputRef: HTMLInputElement | null = $state(null);
	let listboxRef: HTMLUListElement | null = $state(null);

	let filteredOptions = $derived(
		searchTerm.trim() === ''
			? options
			: options.filter((opt: { label: string }) =>
					opt.label.toLowerCase().includes(searchTerm.toLowerCase())
				)
	);

	$effect(() => {
		highlightedIndex = -1;
	});

	$effect(() => {
		const selected = options.find((opt: { value: string; label: string }) => opt.value === value);
		if (selected) {
			searchTerm = selected.label;
		} else if (!isOpen && searchTerm !== '') {
			searchTerm = '';
		}
	});

	function handleSelect(option: { value: string; label: string }) {
		value = option.value;
		searchTerm = option.label;
		isOpen = false;
		onChange(option.value); // 👈 Notificar cambio
		inputRef?.blur();
	}

	function clearSelection() {
		value = '';
		searchTerm = '';
		isOpen = false;
		onChange('');
		inputRef?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					isOpen = true;
				} else if (highlightedIndex < filteredOptions.length - 1) {
					highlightedIndex++;
					scrollToHighlighted();
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (isOpen && highlightedIndex > 0) {
					highlightedIndex--;
					scrollToHighlighted();
				}
				break;

			case 'Enter':
				event.preventDefault();
				if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
					handleSelect(filteredOptions[highlightedIndex]);
				} else if (!isOpen) {
					isOpen = true;
				}
				break;

			case 'Escape':
				event.preventDefault();
				isOpen = false;
				inputRef?.blur();
				break;

			case 'Tab':
				isOpen = false;
				break;
		}
	}

	function scrollToHighlighted() {
		if (listboxRef && highlightedIndex >= 0) {
			const highlightedItem = listboxRef.children[highlightedIndex] as HTMLElement;
			highlightedItem?.scrollIntoView({ block: 'nearest' });
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (inputRef && !inputRef.contains(event.target as Node)) {
			isOpen = false;
			const selected = options.find((opt: { value: string; label: string }) => opt.value === value);
			if (selected && searchTerm !== selected.label) {
				searchTerm = selected.label;
			} else if (!value && searchTerm !== '') {
				searchTerm = '';
			}
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="dropdown w-full" class:dropdown-open={isOpen}>
	<FormField
		{label}
		isSearch={true}
		{required}
		{id}
		{disabled}
		{placeholder}
		type="text"
		bind:value={searchTerm}
		bind:inputRef
		onfocus={() => !disabled && (isOpen = true)}
		onkeydown={handleKeydown}
		autocomplete="off"
		role="combobox"
		aria-expanded={isOpen}
		aria-autocomplete="list"
		aria-controls="select-dropdown"
		aria-label={placeholder}
	/>

	{#if isOpen && !disabled}
		<ul
			bind:this={listboxRef}
			id="select-dropdown"
			class="menu absolute top-full right-0 left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-box bg-base-100 p-0 shadow"
			role="listbox"
			tabindex="-1"
		>
			{#if filteredOptions.length === 0}
				<li
					class="menu-title px-4 py-2 text-gray-400"
					role="option"
					aria-selected="false"
					aria-disabled="true"
				>
					<span>No hay resultados</span>
				</li>
			{:else}
				{#each filteredOptions as option, index (option.value)}
					<li
						role="option"
						aria-selected={value === option.value}
						class="cursor-pointer"
						class:bg-primary={value === option.value}
						class:bg-opacity-20={value === option.value}
						class:bg-base-200={highlightedIndex === index && value !== option.value}
					>
						<button
							type="button"
							class="w-full px-4 py-2 text-left"
							class:text-primary-content={value === option.value}
							onclick={() => handleSelect(option)}
							onmouseenter={() => (highlightedIndex = index)}
						>
							{option.label}
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>
