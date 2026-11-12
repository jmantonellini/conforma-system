<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { GraficoColumnas, Icono, PageLayout, Seccion, Table, filtrar } from '$lib/ui';
	import Indicador from '$lib/modulos/reportes/componentes/Indicador.svelte';
	import { consultaDesdeUrl } from '$lib/modulos/reportes/consulta';
	import { formatear, formatearEje } from '$lib/modulos/reportes/formato';
	import { PERIODOS, describirRango } from '$lib/modulos/reportes/periodos';
	import { getReporte } from '$lib/modulos/reportes/reportes.remote';
	import { SECCIONES_REPORTE, type Tabla } from '$lib/modulos/reportes/tipos';

	const consulta = $derived(consultaDesdeUrl(page.url.searchParams));
	const reporte = $derived(await getReporte(consulta));
	const AGRUPACION = { day: 'por día', week: 'por semana', month: 'por mes' } as const;
	let verTabla = $state(false);
</script>

{#snippet tabla(datos: Tabla)}
	{#snippet encabezado()}
		{#each datos.columnas as columna (columna.clave)}
			<th class={[columna.formato !== 'texto' && 'text-right']}>{columna.etiqueta}</th>
		{/each}
	{/snippet}
	{#snippet fila(registro: Tabla['filas'][number])}
		{#each datos.columnas as columna (columna.clave)}
			<td
				class={columna.formato === 'texto'
					? 'max-w-64 truncate'
					: 'text-right whitespace-nowrap tabular-nums'}
			>
				{formatear(registro[columna.clave], columna.formato)}
			</td>
		{/each}
	{/snippet}
	<Seccion titulo={datos.titulo}>
		<div class="-mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
			<Table
				data={datos.filas}
				header={encabezado}
				row={fila}
				emptyMessage={datos.vacio ?? 'Sin datos en este período'}
			/>
		</div>
	</Seccion>
{/snippet}

<PageLayout>
	<header class="encabezado-fijo flex flex-col gap-3">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Reportes</h1>
				<p class="text-sm text-base-content/60">
					{describirRango(reporte.rango)} · comparado con {describirRango(reporte.previo)}
				</p>
			</div>
			<form method="GET" action={resolve('/reportes/exportar')} data-sveltekit-reload>
				<input type="hidden" name="seccion" value={consulta.seccion} />
				<input type="hidden" name="periodo" value={consulta.periodo} />
				<input type="hidden" name="desde" value={reporte.rango.desde} />
				<input type="hidden" name="hasta" value={reporte.rango.hasta} />
				<button class="btn btn-sm"><Icono nombre="flecha" /> Exportar a Excel</button>
			</form>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<div role="tablist" class="tabs-box tabs tabs-sm">
				{#each SECCIONES_REPORTE as seccion (seccion.valor)}
					<button
						role="tab"
						class={['tab', consulta.seccion === seccion.valor && 'tab-active']}
						aria-selected={consulta.seccion === seccion.valor}
						onclick={() => filtrar({ seccion: seccion.valor })}>{seccion.etiqueta}</button
					>
				{/each}
			</div>
			<div class="ml-auto flex flex-wrap items-center gap-2">
				<select
					class="select w-44 select-sm"
					aria-label="Período"
					value={consulta.periodo}
					onchange={(e) => filtrar({ periodo: e.currentTarget.value })}
				>
					{#each PERIODOS as periodo (periodo.valor)}
						<option value={periodo.valor}>{periodo.etiqueta}</option>
					{/each}
				</select>
				{#if consulta.periodo === 'personalizado'}
					<input
						type="date"
						class="input w-40 input-sm"
						aria-label="Desde"
						value={reporte.rango.desde}
						onchange={(e) => filtrar({ desde: e.currentTarget.value })}
					/>
					<input
						type="date"
						class="input w-40 input-sm"
						aria-label="Hasta"
						value={reporte.rango.hasta}
						onchange={(e) => filtrar({ hasta: e.currentTarget.value })}
					/>
				{/if}
			</div>
		</div>
	</header>

	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each reporte.indicadores as indicador (indicador.etiqueta)}
			<Indicador {indicador} />
		{/each}
	</section>

	<Seccion titulo={reporte.serie.titulo} descripcion="Evolución {AGRUPACION[reporte.agrupacion]}">
		{#snippet acciones()}
			<button class="btn btn-ghost btn-xs" onclick={() => (verTabla = !verTabla)}>
				<Icono nombre={verTabla ? 'tablero' : 'lista'} />
				{verTabla ? 'Ver gráfico' : 'Ver tabla'}
			</button>
		{/snippet}
		{#if verTabla}
			{@render tabla({
				titulo: reporte.serie.titulo,
				columnas: [
					{ clave: 'etiqueta', etiqueta: 'Período', formato: 'texto' },
					{ clave: 'valor', etiqueta: reporte.serie.titulo, formato: reporte.serie.formato }
				],
				filas: reporte.serie.puntos
			})}
		{:else}
			<GraficoColumnas
				titulo="{reporte.serie.titulo} {AGRUPACION[reporte.agrupacion]}"
				puntos={reporte.serie.puntos}
				formatear={(valor) => formatear(valor, reporte.serie.formato)}
				formatearEje={(valor) => formatearEje(valor, reporte.serie.formato)}
			/>
		{/if}
	</Seccion>

	<div class="grid items-start gap-4 sm:gap-6 xl:grid-cols-2">
		{#each reporte.tablas as datos (datos.titulo)}
			{@render tabla(datos)}
		{/each}
	</div>
</PageLayout>
