<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Icono from './Icono.svelte';
	import PageLayout from './PageLayout.svelte';
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
		footer
	}: {
		titulo: string;
		datos: T[];
		total?: number;
		pagina?: number;
		paginas?: number;
		/** Placeholder del buscador, o `false` para ocultarlo. */
		buscar?: string | false;
		vacio?: string;
		/** Botones del encabezado (p. ej. "Nuevo"). */
		acciones?: Snippet;
		/** Selects/filtros junto al buscador. */
		filtros?: Snippet;
		/** Acciones secundarias a la derecha de la barra (exportar, importar). */
		herramientas?: Snippet;
		header: Snippet;
		row: Snippet<[T]>;
		footer?: Snippet;
	} = $props();

	const porPagina = $derived(paginas > 0 ? Math.ceil(total / paginas) : total);
	const desde = $derived(total ? (pagina - 1) * porPagina + 1 : 0);
	const hasta = $derived(Math.min(pagina * porPagina, total));
</script>

<PageLayout>
	<header class="flex flex-wrap items-end justify-between gap-3">
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
		{#if buscar !== false || filtros || herramientas}
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
				{#if herramientas}
					<div class="ml-auto flex items-center gap-2">{@render herramientas()}</div>
				{/if}
			</div>
		{/if}

		<Table data={datos} {header} {row} {footer} emptyMessage={vacio} />

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
