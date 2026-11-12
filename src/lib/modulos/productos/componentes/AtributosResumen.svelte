<script lang="ts">
	import { formatearAtributo, type GrupoAtributos } from '../atributos';

	let { grupos }: { grupos: GrupoAtributos[] } = $props();
</script>

{#if grupos.length}
	<dl class="datos">
		{#each grupos as grupo (grupo.nombre)}
			<div class={[grupo.atributos.some((a) => a.tipo === 'texto') && 'col-span-full']}>
				<dt>{grupo.nombre}</dt>
				<dd>
					{#each grupo.atributos as atributo, indice (atributo.clave)}
						{#if indice}<span class="text-base-content/40"> · </span>{/if}
						<span class="text-base-content/60">{atributo.etiqueta}</span>
						{formatearAtributo(atributo)}
					{/each}
				</dd>
			</div>
		{/each}
	</dl>
{/if}
