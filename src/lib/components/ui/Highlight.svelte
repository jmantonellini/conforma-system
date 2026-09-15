<script lang="ts">
	type Part = { value: string; match: boolean };

	let { text = '', query = '' }: { text?: string | number | null; query?: string } = $props();

	let parts = $derived.by<Part[]>(() => {
		const value = String(text ?? '');
		const term = query.trim();
		if (!term) return [{ value, match: false }];

		const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
		const result: Part[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = pattern.exec(value))) {
			if (match.index > lastIndex) {
				result.push({ value: value.slice(lastIndex, match.index), match: false });
			}
			result.push({ value: match[0], match: true });
			lastIndex = match.index + match[0].length;
			if (match[0].length === 0) pattern.lastIndex++;
		}

		if (lastIndex < value.length) result.push({ value: value.slice(lastIndex), match: false });
		return result.length ? result : [{ value, match: false }];
	});
</script>

{#each parts as part, index (index)}
	{#if part.match}
		<mark class="bg-warning/30 font-bold text-inherit">{part.value}</mark>
	{:else}
		{part.value}
	{/if}
{/each}
