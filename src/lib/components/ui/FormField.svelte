<script lang="ts">
	let {
		label,
		type = 'text',
		value = $bindable(),
		placeholder = '',
		required = false,
		textarea = false,
		rows = 3,
		id = '',
		step,
		oninput,
		inputRef = $bindable<HTMLInputElement | HTMLTextAreaElement | null>(null),
		...others
	}: {
		label: string;
		type?: string;
		value?: unknown;
		placeholder?: string;
		required?: boolean;
		textarea?: boolean;
		rows?: number;
		id?: string;
		step?: string;
		oninput?: (event: Event) => void;
		inputRef?: HTMLInputElement | HTMLTextAreaElement | null;
		[key: string]: unknown;
	} = $props();
</script>

<div class="flex w-full flex-col gap-2">
	<div class="flex items-center justify-between">
		<label class="label" for={id}>
			{label}
			{#if required}<span class="text-error">*</span>{/if}
		</label>
		{#if required && !value}
			<div class="label">
				<span class="text-error">Este campo es requerido</span>
			</div>
		{/if}
	</div>
	{#if textarea}
		<textarea
			{id}
			bind:this={inputRef}
			bind:value
			{placeholder}
			{rows}
			{oninput}
			class="textarea w-full resize-none"
			class:textarea-error={required && !value}
			{...others}
		></textarea>
	{:else}
		<input
			{type}
			{id}
			bind:this={inputRef}
			bind:value
			{placeholder}
			{step}
			{oninput}
			class="input-bordered input w-full"
			class:input-error={required && !value}
			{...others}
		/>
	{/if}
</div>
