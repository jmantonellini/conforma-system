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
	let filteredOptions = $derived(
		searchTerm
			? options.filter(
					(opt) =>
						opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
						opt.value.toLowerCase().includes(searchTerm.toLowerCase())
				)
			: options
	);

	$effect(() => {
		const currentValue = field?.value?.();
		const selectedOption = options.find((opt) => opt.value === currentValue);
		searchTerm = selectedOption ? selectedOption.label : '';
	});

	function clearSelection() {
		if (field?.set) field.set('');
		searchTerm = '';
		isOpen = true;
		onChange('');
	}

	function handleSelect(option: { value: string; label: string }) {
		if (field?.set) field.set(option.value);
		searchTerm = option.label;
		isOpen = false;
		onChange(option.value);
	}
</script>

<div class="relative {className || ''}">
	<FormFieldWrapper {label} {id}>
		<div class="relative">
			<input
				type="text"
				class="input w-full pr-10"
				{placeholder}
				bind:value={searchTerm}
				onfocus={() => (isOpen = true)}
				onblur={() => setTimeout(() => (isOpen = false), 180)}
				{...restProps}
			/>
			{#if allowClear && searchTerm}
				<button
					type="button"
					class="btn absolute top-1/2 right-2 btn-circle -translate-y-1/2 btn-ghost btn-xs"
					aria-label="Limpiar búsqueda"
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
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-base-300 bg-base-100 shadow-lg"
		>
			{#each filteredOptions as opt (opt.value)}
				<li>
					<button
						type="button"
						class="w-full px-4 py-2 text-left hover:bg-base-200"
						onclick={() => handleSelect(opt)}
					>
						{opt.label}
					</button>
				</li>
			{/each}
		</ul>
	{:else if isOpen && !filteredOptions.length}
		<div
			class="absolute z-10 mt-1 w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content/70 shadow-lg"
		>
			No hay resultados
		</div>
	{/if}
</div>
