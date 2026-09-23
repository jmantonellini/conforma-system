<script lang="ts">
	let { form } = $props<{ form: any }>();
	const issues = $derived(form.fields?.allIssues?.() ?? []);
</script>

{#if issues.length}
	<div role="alert" class="mt-4 alert alert-error">
		<div>
			{#each issues as issue (issue.message)}
				<p>{issue.message}</p>
			{/each}
		</div>
	</div>
{/if}
