<script lang="ts" module>
	import type { NombreIcono } from './Icono.svelte';

	export type OpcionVista = { valor: string; etiqueta: string; icono: NombreIcono };
</script>

<script lang="ts">
	import Icono from './Icono.svelte';
	import { filtrar, parametro } from './url-filtros';

	let { opciones, clave = 'vista' }: { opciones: OpcionVista[]; clave?: string } = $props();

	const actual = $derived(parametro(clave, opciones[0].valor));
</script>

<div class="join" role="group" aria-label="Vista">
	{#each opciones as opcion, indice (opcion.valor)}
		<button
			type="button"
			class={[
				'btn join-item btn-sm',
				actual === opcion.valor ? 'btn-soft btn-primary' : 'btn-ghost'
			]}
			aria-pressed={actual === opcion.valor}
			title={opcion.etiqueta}
			onclick={() => filtrar({ [clave]: indice === 0 ? null : opcion.valor }, { reemplazar: true })}
		>
			<Icono nombre={opcion.icono} />
			<span class="hidden sm:inline">{opcion.etiqueta}</span>
		</button>
	{/each}
</div>
