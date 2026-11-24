<script lang="ts">
	import { formatearAtributo, type GrupoAtributos } from '../atributos';

	let { grupos }: { grupos: GrupoAtributos[] } = $props();
</script>

{#if grupos.length}
	<div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
		{#each grupos as grupo (grupo.nombre)}
			<section class="rounded-box border border-base-300">
				<h3
					class="border-b border-base-300 px-3 py-1.5 text-xs font-semibold tracking-wide text-base-content/70 uppercase"
				>
					{grupo.nombre}
				</h3>
				<dl class="divide-y divide-base-200 px-3">
					{#each grupo.atributos as atributo (atributo.clave)}
						<div class="flex items-baseline justify-between gap-3 py-1">
							<dt class="shrink-0 text-sm text-base-content/70">{atributo.etiqueta}</dt>
							<dd
								class={[
									'min-w-0 text-right text-sm font-medium',
									atributo.tipo === 'texto' ? 'break-words' : 'whitespace-nowrap tabular-nums'
								]}
							>
								{formatearAtributo(atributo)}
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	</div>
{/if}
