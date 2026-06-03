<script lang="ts">
	let {
		search = $bindable(),
		placeholder = 'Buscar...'
	}: {
		search: string;
		placeholder?: string;
	} = $props();
</script>

<div class="join w-full md:w-auto">
	<input
		type="search"
		bind:value={search}
		{placeholder}
		class="input-bordered input join-item w-full"
	/>
	<button class="btn join-item bg-base-300"> Buscar</button>
</div>
