<script lang="ts">
	let {
		currentPage,
		totalPages,
		onPageChange
	}: {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	} = $props();
</script>

{#if totalPages > 1}
	<div class="join">
		<button
			class="btn join-item"
			disabled={currentPage === 1}
			onclick={() => onPageChange(currentPage - 1)}
		>
			«
		</button>

		<button class="btn btn-active join-item">
			{currentPage} / {totalPages}
		</button>

		<button
			class="btn join-item"
			disabled={currentPage === totalPages}
			onclick={() => onPageChange(currentPage + 1)}
		>
			»
		</button>
	</div>
{/if}
