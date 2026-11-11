<script lang="ts">
	let { children } = $props();
</script>

<main class="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
	{@render children()}
</main>
