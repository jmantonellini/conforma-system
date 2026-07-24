<script lang="ts">
	let {
		marca,
		size = 6,
		className = ''
	} = $props<{
		marca: { nombre: string; logo_url?: string | null };
		size?: number;
		className?: string;
	}>();
</script>

{#if marca?.logo_url}
	<img
		src={marca.logo_url}
		alt={marca.nombre}
		class="inline-block object-contain {className}"
		style="width: calc({size} * 0.25rem); height: calc({size} * 0.25rem);"
		loading="lazy"
	/>
{:else}
	<!-- Fallback: inicial del nombre -->
	<div
		class="placeholder avatar {className}"
		style="width: calc({size} * 0.25rem); height: calc({size} * 0.25rem);"
	>
		<div
			class="flex h-full w-full items-center justify-center rounded-full bg-neutral/10 text-neutral"
		>
			<span class="text-xs font-medium" style="font-size: calc({size} * 0.1rem);">
				{marca?.nombre?.charAt(0) || '?'}
			</span>
		</div>
	</div>
{/if}
