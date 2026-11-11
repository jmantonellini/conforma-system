<script lang="ts">
	let {
		nombre,
		apellido,
		vacio = '-'
	}: { nombre?: string | null; apellido?: string | null; vacio?: string } = $props();

	const completo = $derived([nombre, apellido].filter(Boolean).join(' '));
	const iniciales = $derived(
		completo
			.split(/\s+/)
			.slice(0, 2)
			.map((parte) => parte[0])
			.join('')
			.toUpperCase()
	);
</script>

{#if completo}
	<span class="inline-flex items-center gap-2 whitespace-nowrap">
		<span
			class="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[0.625rem] font-semibold text-primary"
			aria-hidden="true">{iniciales}</span
		>
		{completo}
	</span>
{:else}
	<span class="text-base-content/40">{vacio}</span>
{/if}
