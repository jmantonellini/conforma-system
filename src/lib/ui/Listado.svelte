<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Icono from './Icono.svelte';
	import PageLayout from './PageLayout.svelte';
	import SelectorVista from './SelectorVista.svelte';
	import Table from './Table.svelte';
	import { filtrar, parametro } from './url-filtros';
	import { debounce } from '$lib/utils/debounce';

	let {
		titulo,
		datos,
		total = datos.length,
		pagina = 1,
		paginas = 1,
		buscar = 'Buscar...',
		vacio = 'No hay registros',
		acciones,
		filtros,
		herramientas,
		header,
		row,
		footer,
		tarjeta
	}: {
		titulo: string;
		datos: T[];
		total?: number;
		pagina?: number;
		paginas?: number;
		buscar?: string | false;
		vacio?: string;
		acciones?: Snippet;
		filtros?: Snippet;
		herramientas?: Snippet;
		header: Snippet;
		row: Snippet<[T]>;
		footer?: Snippet;
		tarjeta?: Snippet<[T]>;
	} = $props();

	const enCuadricula = $derived(!!tarjeta && parametro('vista') === 'cuadricula');

	const porPagina = $derived(paginas > 0 ? Math.ceil(total / paginas) : total);
	const desde = $derived(total ? (pagina - 1) * porPagina + 1 : 0);
	const hasta = $derived(Math.min(pagina * porPagina, total));
</script>

<PageLayout>
	<header class="encabezado-fijo flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{titulo}</h1>
			<p class="text-sm text-base-content/60">
				{total}
				{total === 1 ? 'registro' : 'registros'}
			</p>
		</div>
		{#if acciones}<div class="flex flex-wrap gap-2">{@render acciones()}</div>{/if}
	</header>

	<div class="card overflow-hidden">
		{#if buscar !== false || filtros || herramientas || tarjeta}
			<div class="flex flex-wrap items-center gap-2 border-b border-base-300 p-3">
				{#if buscar !== false}
					<label class="input w-full input-sm sm:w-72">
						<Icono nombre="buscar" class="size-4 opacity-50" />
						<input
							type="search"
							placeholder={buscar}
							value={parametro('search')}
							oninput={(evento) => {
								const valor = evento.currentTarget.value;
								debounce(() => filtrar({ search: valor }, { reemplazar: true }), 300);
							}}
						/>
					</label>
				{/if}
				{@render filtros?.()}
				{#if herramientas || tarjeta}
					<div class="ml-auto flex items-center gap-2">
						{@render herramientas?.()}
						{#if tarjeta}
							<SelectorVista
								opciones={[
									{ valor: 'lista', etiqueta: 'Lista', icono: 'lista' },
									{ valor: 'cuadricula', etiqueta: 'Cuadrícula', icono: 'cuadricula' }
								]}
							/>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if enCuadricula && tarjeta}
			{#if datos.length}
				<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3 p-3">
					{#each datos as dato, indice (indice)}
						<li class="min-w-0">{@render tarjeta(dato)}</li>
					{/each}
				</ul>
			{:else}
				<div class="flex flex-col items-center gap-2 py-10 text-base-content/50">
					<Icono nombre="bandeja" class="size-8" />
					{vacio}
				</div>
			{/if}
		{:else}
			<Table data={datos} {header} {row} {footer} emptyMessage={vacio} />
		{/if}

		{#if total > 0}
			<footer
				class="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 px-4 py-2.5 text-sm text-base-content/60"
			>
				<span>Mostrando {desde}–{hasta} de {total}</span>
				{#if paginas > 1}
					<div class="join">
						<button
							class="btn join-item btn-square btn-sm"
							aria-label="Página anterior"
							disabled={pagina <= 1}
							onclick={() => filtrar({ page: pagina - 1 })}
						>
							<Icono nombre="izquierda" />
						</button>
						<span class="btn pointer-events-none join-item font-normal btn-sm">
							{pagina} / {paginas}
						</span>
						<button
							class="btn join-item btn-square btn-sm"
							aria-label="Página siguiente"
							disabled={pagina >= paginas}
							onclick={() => filtrar({ page: pagina + 1 })}
						>
							<Icono nombre="derecha" />
						</button>
					</div>
				{/if}
			</footer>
		{/if}
	</div>
</PageLayout>
