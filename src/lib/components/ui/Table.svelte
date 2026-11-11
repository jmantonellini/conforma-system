<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Icono from './Icono.svelte';

	let {
		data,
		header,
		row,
		footer,
		loading = false,
		emptyMessage = 'No hay datos disponibles'
	}: {
		data: T[];
		header: Snippet;
		row: Snippet<[T]>;
		footer?: Snippet;
		loading?: boolean;
		emptyMessage?: string;
	} = $props();
</script>

<div class="overflow-x-auto">
	<table class="table table-sm">
		<thead>
			<tr>{@render header()}</tr>
		</thead>
		<tbody>
			{#if loading}
				<tr>
					<td colspan={99} class="py-10 text-center">
						<span class="loading loading-md loading-spinner"></span>
					</td>
				</tr>
			{:else if !data?.length}
				<tr>
					<td colspan={99}>
						<div class="flex flex-col items-center gap-2 py-10 text-base-content/50">
							<Icono nombre="bandeja" class="size-8" />
							{emptyMessage}
						</div>
					</td>
				</tr>
			{:else}
				{#each data as item (item)}
					<tr>{@render row(item)}</tr>
				{/each}
			{/if}
		</tbody>
		{#if footer}
			<tfoot>
				<tr>{@render footer()}</tr>
			</tfoot>
		{/if}
	</table>
</div>
