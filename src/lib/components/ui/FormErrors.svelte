<script lang="ts">
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form }: { form: any } = $props();
	const issues: { message: string }[] = $derived(form.fields?.allIssues?.() ?? []);
</script>

{#if issues.length}
	<div role="alert" class="alert alert-soft text-sm alert-error">
		<ul class="list-inside list-disc">
			{#each issues as issue (issue.message)}
				<li>{issue.message}</li>
			{/each}
		</ul>
	</div>
{/if}
