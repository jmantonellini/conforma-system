<script lang="ts">
	let { children } = $props();
</script>

<div class="bg-base-100 p-6">
	<div class="mx-auto max-w-7xl">
		{@render children()}
	</div>
</div>
