<script lang="ts">
	import { Icono } from '$lib/ui';
	import { formatear, variacion } from '../formato';
	import type { Indicador } from '../tipos';

	let { indicador }: { indicador: Indicador } = $props();

	const cambio = $derived(variacion(indicador.valor, indicador.previo));
	const bueno = $derived(
		cambio === null || indicador.mejorSiSube === undefined
			? null
			: cambio === 0
				? null
				: cambio > 0 === indicador.mejorSiSube
	);
	const porcentaje = new Intl.NumberFormat('es-AR', {
		style: 'percent',
		maximumFractionDigits: 0,
		signDisplay: 'exceptZero'
	});
</script>

<article class="flex flex-col gap-1 seccion" title={indicador.ayuda}>
	<span class="flex items-center gap-1 text-sm text-base-content/60">
		{indicador.etiqueta}
		{#if indicador.ayuda}<span class="cursor-help text-xs text-base-content/40">ⓘ</span>{/if}
	</span>
	<span class="text-2xl font-semibold tabular-nums">
		{formatear(indicador.valor, indicador.formato)}
	</span>
	{#if indicador.previo !== null}
		<span class="flex items-center gap-1 text-xs text-base-content/60">
			{#if cambio !== null}
				<span
					class={[
						'inline-flex items-center gap-0.5 font-medium',
						bueno === true && 'text-success',
						bueno === false && 'text-error'
					]}
				>
					<Icono nombre={cambio >= 0 ? 'arriba' : 'abajo'} class="size-3" />
					{porcentaje.format(cambio)}
				</span>
			{/if}
			vs {formatear(indicador.previo, indicador.formato)} el período anterior
		</span>
	{/if}
</article>
