<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	let {
		data,
		header,
		row,
		loading = false,
		emptyMessage = 'No hay datos disponibles'
	}: {
		data: T[];
		header: Snippet;
		row: Snippet<[T]>;
		loading?: boolean;
		emptyMessage?: string;
	} = $props();
</script>

<div class="overflow-x-auto">
	<table class="table table-zebra">
		<thead>
			<tr>
				{@render header()}
			</tr>
		</thead>
		<tbody>
			{#if loading}
				<tr>
					<td colspan={99} class="text-center">
						<span class="loading loading-md loading-spinner"></span>
					</td>
				</tr>
			{:else if data?.length === 0}
				<tr>
					<td colspan={99} class="text-center text-gray-500">
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each data as item (item)}
					<tr>
						{@render row(item)}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
