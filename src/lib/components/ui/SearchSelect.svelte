<script lang="ts">
	import { FormFieldWrapper } from '.';

	let {
		options = [],
		label,
		field,
		placeholder = 'Seleccionar...',
		onChange = () => {},
		...restProps
	}: {
		options: { value: string; label: string }[];
		label: string;
		field: any;
		placeholder?: string;
		onChange?: (val: string) => void;
		[key: string]: any;
	} = $props();

	let searchTerm = $state('');
	let isOpen = $state(false);

	$effect(() => {
		// Sincroniza el término de búsqueda con el valor actual del select oculto
		const currentValue = field.value();
		const selectedOption = options.find((opt) => opt.value === currentValue);
		if (selectedOption) searchTerm = selectedOption.label;
		else searchTerm = '';
	});

	function handleSelect(option: { value: string; label: string }) {
		// Al seleccionar, actualiza el valor del select oculto
		field.set(option.value);
		searchTerm = option.label;
		isOpen = false;
		onChange(option.value);
	}
</script>

<div class="relative">
	<FormFieldWrapper {label} id={field.value()}>
		<!-- Input visible para búsqueda -->
		<input
			type="text"
			class="input w-full"
			{placeholder}
			bind:value={searchTerm}
			onfocus={() => (isOpen = true)}
			onblur={() => setTimeout(() => (isOpen = false), 200)}
			{...restProps}
		/>
	</FormFieldWrapper>

	<!-- Select oculto que se conecta al Remote Form -->
	<select {...field.as('select')} class="hidden">
		<option value="">Seleccionar...</option>
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	{#if isOpen && options.filter((opt) => opt.label
				.toLowerCase()
				.includes(searchTerm.toLowerCase())).length}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-base-100 shadow-lg"
		>
			{#each options.filter((opt) => opt.label
					.toLowerCase()
					.includes(searchTerm.toLowerCase())) as opt (opt.value)}
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
	{/if}
</div>
