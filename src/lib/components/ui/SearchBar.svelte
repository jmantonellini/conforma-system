<script lang="ts">
	let {
		search = $bindable(),
		autofocus = false,
		placeholder = 'Buscar...',
		...restProps
	} = $props();
</script>

<div class="join w-full md:w-auto">
	<input
		type="search"
		bind:value={search}
		{placeholder}
		{autofocus}
		{...restProps}
		class="input join-item w-full"
	/>
	<button class="btn join-item bg-base-300">Buscar</button>
</div>
