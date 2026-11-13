<script lang="ts">
	import { onMount } from 'svelte';
	import { getDolarBNA } from '$lib/modulos/ventas/moneda.remote';
	import { formatearDosDecimales } from '$lib/utils/precios';

	const REFRESCO_MS = 15 * 60 * 1000;

	const dolar = $derived(await getDolarBNA());

	onMount(() => {
		const intervalo = setInterval(() => getDolarBNA().refresh(), REFRESCO_MS);
		return () => clearInterval(intervalo);
	});
</script>

{#if dolar}
	<span
		class="tooltip tooltip-bottom hidden items-baseline gap-1.5 rounded-field px-2 text-xs text-base-content/60 tabular-nums md:inline-flex"
		data-tip={`Banco Nación, billete vendedor · ${dolar.fecha} ${dolar.hora}`}
	>
		<span class="font-medium tracking-wide uppercase">Dólar BNA</span>
		<span class="text-sm font-semibold text-base-content/80"
			>$ {formatearDosDecimales(dolar.venta)}</span
		>
	</span>
{/if}
