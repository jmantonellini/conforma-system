<script lang="ts">
	export type PasoProceso = {
		key: string;
		label: string;
		href?: string;
		status?: string | null;
	};

	let { steps, currentKey }: { steps: PasoProceso[]; currentKey: string } = $props();

	let currentIndex = $derived(steps.findIndex((step) => step.key === currentKey));
	let previous = $derived(steps[currentIndex - 1]);
	let current = $derived(steps[currentIndex]);
	let next = $derived(steps[currentIndex + 1]);
</script>

{#if previous || next}
	<nav class="join" aria-label="Navegación del proceso">
		{#if previous?.href}
			<a
				class="btn join-item btn-outline btn-sm"
				href={previous.href}
				title={previous.status ?? undefined}
			>
				← {previous.label}
			</a>
		{/if}
		<span class="btn join-item btn-sm" aria-current="page" title={current?.status ?? undefined}>
			{current?.label}
		</span>
		{#if next?.href}
			<a class="btn join-item btn-outline btn-sm" href={next.href} title={next.status ?? undefined}>
				{next.label} →
			</a>
		{/if}
	</nav>
{/if}
