<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	let {
		data,
		header,
		row,
		footer,
		loading = false,
		emptyMessage = 'No hay datos disponibles',
		onSort
	}: {
		data: T[];
		header: Snippet<[((key: string) => void) | undefined]>;
		row: Snippet<[T]>;
		footer?: Snippet;
		loading?: boolean;
		emptyMessage?: string;
		onSort?: (key: string) => void;
	} = $props();
</script>

<div class="overflow-x-auto">
	<table class="table table-zebra table-sm">
		<thead>
			<tr>
				{@render header(onSort)}
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
		{#if footer}
			<tfoot>
				<tr>
					{@render footer()}
				</tr>
			</tfoot>
		{/if}
	</table>
</div>
