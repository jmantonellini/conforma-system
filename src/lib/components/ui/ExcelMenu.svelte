<script lang="ts">
	let {
		importHref,
		exportHref,
		canImport = true,
		canExport = true
	} = $props<{
		importHref: string;
		exportHref: string;
		canImport?: boolean;
		canExport?: boolean;
	}>();
</script>

{#if canImport || canExport}
	<details class="dropdown dropdown-end">
		<summary class="btn btn-outline btn-sm">Excel</summary>
		<ul
			class="dropdown-content menu z-10 mt-2 w-36 rounded-box border border-base-300 bg-base-100 p-2 shadow"
		>
			{#if canImport}
				<li><a href={importHref}>Importar</a></li>
			{/if}
			{#if canExport}
				<li><a href={exportHref} data-sveltekit-reload>Exportar</a></li>
			{/if}
		</ul>
	</details>
{/if}
