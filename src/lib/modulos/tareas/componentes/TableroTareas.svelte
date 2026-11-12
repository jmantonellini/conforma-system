<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import type { TareaListada } from '../tareas.remote';
	import { ESTADOS_TAREA, EstadosTarea } from '../tipos';
	import TarjetaTarea from './TarjetaTarea.svelte';

	let {
		tareas,
		onAbrir,
		onMover,
		onReordenar,
		menu
	}: {
		tareas: TareaListada[];
		onAbrir: (tarea: TareaListada) => void;
		onMover: (tarea: TareaListada, estado: EstadosTarea) => void;
		onReordenar: (orden: { id: number; orden: number }[]) => void;
		menu?: Snippet<[TareaListada]>;
	} = $props();

	let arrastrada = $state<TareaListada | null>(null);
	let destino = $state<{ estado: EstadosTarea; antesDe: number | null } | null>(null);

	const deColumna = (estado: EstadosTarea) => tareas.filter((t) => t.estado === estado);

	function soltar(estado: EstadosTarea) {
		const tarea = arrastrada;
		const antesDe = destino?.antesDe ?? null;
		arrastrada = null;
		destino = null;
		if (!tarea) return;
		if (tarea.estado !== estado) return onMover(tarea, estado);
		if (antesDe === tarea.id) return;
		const columna = deColumna(estado).filter((t) => t.id !== tarea.id);
		const indice = antesDe === null ? columna.length : columna.findIndex((t) => t.id === antesDe);
		columna.splice(indice, 0, tarea);
		onReordenar(columna.map((t, orden) => ({ id: t.id, orden })));
	}
</script>

<div class="grid gap-4 md:grid-cols-3">
	{#each ESTADOS_TAREA as columna (columna.valor)}
		{@const items = deColumna(columna.valor)}
		<section
			class={[
				'flex min-h-48 flex-col gap-2 rounded-box border border-base-300 bg-base-100/60 p-3 transition-colors',
				destino?.estado === columna.valor && 'border-primary bg-primary/5'
			]}
			aria-label={columna.etiqueta}
			ondragover={(e) => {
				e.preventDefault();
				if (destino?.estado !== columna.valor) destino = { estado: columna.valor, antesDe: null };
			}}
			ondrop={(e) => {
				e.preventDefault();
				soltar(columna.valor);
			}}
		>
			<header class="flex items-center justify-between px-1 pb-1">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<span class={['status', `status-${columna.color}`]}></span>
					{columna.etiqueta}
				</h2>
				<span class="badge badge-ghost badge-sm">{items.length}</span>
			</header>
			{#each items as tarea (tarea.id)}
				<div
					animate:flip={{ duration: 200 }}
					draggable="true"
					role="listitem"
					class={[
						'cursor-grab border-t-2 border-transparent pt-1 active:cursor-grabbing',
						destino?.antesDe === tarea.id && 'border-primary',
						arrastrada?.id === tarea.id && 'opacity-50'
					]}
					ondragstart={(e) => {
						arrastrada = tarea;
						e.dataTransfer?.setData('text/plain', String(tarea.id));
					}}
					ondragend={() => {
						arrastrada = null;
						destino = null;
					}}
					ondragover={(e) => {
						e.preventDefault();
						e.stopPropagation();
						destino = { estado: columna.valor, antesDe: tarea.id };
					}}
					ondrop={(e) => {
						e.preventDefault();
						e.stopPropagation();
						soltar(columna.valor);
					}}
				>
					<TarjetaTarea {tarea} {menu} onAbrir={() => onAbrir(tarea)} />
				</div>
			{:else}
				<p
					class="grid flex-1 place-items-center rounded-box border border-dashed border-base-300 text-xs text-base-content/40"
				>
					Arrastrá tareas acá
				</p>
			{/each}
		</section>
	{/each}
</div>
