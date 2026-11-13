<script lang="ts">
	import { FormFieldWrapper } from '$lib/ui';
	import { agruparAtributos, type DefinicionAtributo, type ValoresAtributos } from '../atributos';

	let {
		definiciones,
		valores = $bindable({}),
		nombre = 'atributos',
		compacto = false
	}: {
		definiciones: DefinicionAtributo[];
		valores?: ValoresAtributos;
		nombre?: string;
		compacto?: boolean;
	} = $props();

	const grupos = $derived(agruparAtributos(definiciones, valores));

	const etiqueta = ({ etiqueta, unidad }: DefinicionAtributo) =>
		unidad ? `${etiqueta} (${unidad})` : etiqueta;
</script>

<input type="hidden" name={nombre} value={JSON.stringify(valores)} />

<div class={['grid gap-6', !compacto && 'md:grid-cols-3']}>
	{#each grupos as grupo (grupo.nombre)}
		<fieldset class="flex min-w-0 flex-col gap-3">
			<legend class="mb-3 text-sm font-semibold">{grupo.nombre}</legend>
			<div class="grid grid-cols-2 items-end gap-4">
				{#each grupo.atributos as atributo (atributo.clave)}
					<FormFieldWrapper
						label={etiqueta(atributo)}
						id="atributo-{atributo.clave}"
						class={atributo.tipo === 'texto' ? 'col-span-2' : ''}
					>
						<input
							id="atributo-{atributo.clave}"
							class="input"
							type={atributo.tipo === 'numero' ? 'number' : 'text'}
							step="any"
							value={atributo.valor ?? ''}
							oninput={(e) => (valores = { ...valores, [atributo.clave]: e.currentTarget.value })}
						/>
					</FormFieldWrapper>
				{/each}
			</div>
		</fieldset>
	{/each}
</div>
