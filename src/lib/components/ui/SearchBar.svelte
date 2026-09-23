<script lang="ts">
	let { search = $bindable(), placeholder = 'Buscar...', ...restProps } = $props();
</script>

<div class="join w-full md:w-auto">
	<input
		type="search"
		bind:value={search}
		{placeholder}
		{...restProps}
		class="input input-sm join-item w-full"
	/>
	<button class="btn btn-sm join-item bg-base-300">Buscar</button>
</div>
