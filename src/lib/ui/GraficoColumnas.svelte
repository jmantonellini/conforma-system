<script lang="ts">
	type Punto = { clave: string; etiqueta: string; valor: number };

	let {
		puntos,
		titulo,
		formatear,
		formatearEje = formatear,
		alto = 240
	}: {
		puntos: Punto[];
		titulo: string;
		formatear: (valor: number) => string;
		formatearEje?: (valor: number) => string;
		alto?: number;
	} = $props();

	const IZQUIERDA = 64;
	const DERECHA = 8;
	const ARRIBA = 12;
	const ABAJO = 28;
	const MAX_GROSOR = 24;

	let ancho = $state(640);
	let activo = $state<number | null>(null);

	function escala(maximo: number) {
		if (maximo <= 0) return { tope: 4, marcas: [0, 1, 2, 3, 4] };
		const crudo = maximo / 4;
		const magnitud = 10 ** Math.floor(Math.log10(crudo));
		const normal = crudo / magnitud;
		const paso =
			(normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 2.5 ? 2.5 : normal <= 5 ? 5 : 10) * magnitud;
		const tope = paso * Math.ceil(maximo / paso);
		return {
			tope,
			marcas: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso)
		};
	}

	const base = $derived(alto - ABAJO);
	const ejes = $derived(escala(Math.max(0, ...puntos.map((p) => p.valor))));
	const banda = $derived((ancho - IZQUIERDA - DERECHA) / Math.max(puntos.length, 1));
	const grosor = $derived(Math.max(2, Math.min(MAX_GROSOR, banda - 2)));
	const cadaCuanto = $derived(
		Math.max(1, Math.ceil(puntos.length / Math.max(1, Math.floor((ancho - IZQUIERDA) / 64))))
	);
	const y = (valor: number) => ARRIBA + (base - ARRIBA) * (1 - valor / ejes.tope);
	const centro = (indice: number) => IZQUIERDA + indice * banda + banda / 2;

	function columna(x: number, tope: number, w: number) {
		const r = Math.min(4, w / 2, base - tope);
		return `M${x},${base}V${tope + r}Q${x},${tope} ${x + r},${tope}H${x + w - r}Q${x + w},${tope} ${x + w},${tope + r}V${base}Z`;
	}
</script>

<figure class="relative w-full" bind:clientWidth={ancho}>
	<svg width={ancho} height={alto} role="img" aria-label={titulo} class="block overflow-visible">
		{#each ejes.marcas as marca (marca)}
			<line
				x1={IZQUIERDA}
				x2={ancho - DERECHA}
				y1={y(marca)}
				y2={y(marca)}
				class="stroke-base-300"
				stroke-width="1"
			/>
			<text
				x={IZQUIERDA - 8}
				y={y(marca)}
				text-anchor="end"
				dominant-baseline="middle"
				class="fill-base-content/60 text-[11px] tabular-nums">{formatearEje(marca)}</text
			>
		{/each}

		{#each puntos as punto, indice (punto.clave)}
			{#if punto.valor > 0}
				<path
					d={columna(centro(indice) - grosor / 2, y(punto.valor), grosor)}
					class={[
						'fill-primary transition-opacity',
						activo !== null && activo !== indice && 'opacity-40'
					]}
				/>
			{/if}
			{#if indice % cadaCuanto === 0}
				<text
					x={centro(indice)}
					y={base + 18}
					text-anchor="middle"
					class="fill-base-content/60 text-[11px]">{punto.etiqueta}</text
				>
			{/if}
		{/each}
	</svg>

	<div
		class="absolute inset-0 flex"
		style:padding-left="{IZQUIERDA}px"
		style:padding-right="{DERECHA}px"
	>
		{#each puntos as punto, indice (punto.clave)}
			<button
				type="button"
				class="h-full flex-1 cursor-default focus:outline-none"
				aria-label="{punto.etiqueta}: {formatear(punto.valor)}"
				onpointerenter={() => (activo = indice)}
				onpointerleave={() => (activo = null)}
				onfocus={() => (activo = indice)}
				onblur={() => (activo = null)}
			></button>
		{/each}
	</div>

	{#if activo !== null}
		{@const punto = puntos[activo]}
		<div
			class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow-md"
			style:left="{centro(activo)}px"
			style:top="{y(punto.valor) - 8}px"
			role="tooltip"
		>
			<strong class="block text-sm tabular-nums">{formatear(punto.valor)}</strong>
			<span class="text-base-content/60">{punto.etiqueta}</span>
		</div>
	{/if}
</figure>
