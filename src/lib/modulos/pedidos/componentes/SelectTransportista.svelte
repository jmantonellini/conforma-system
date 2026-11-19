<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { SearchSelect } from '$lib/ui';
	import type { Option } from '$lib/ui/SearchSelect.svelte';
	import { RETIRA_EN_FABRICA } from '$lib/modulos/ventas/trabajo';
	import { can } from '$lib/utils/permissions';
	import { getNombresTransportistas } from '../transportistas.remote';
	import TransportistaRapido from './TransportistaRapido.svelte';

	type Campo = {
		as: (tipo: 'select') => Record<string, unknown>;
		set: (valor: string) => void;
		value: () => unknown;
	};

	let {
		id,
		campo,
		inicial = '',
		label = 'Transportista',
		disabled = false,
		requerido = false
	}: {
		id: string;
		campo: Campo;
		inicial?: string;
		label?: string;
		disabled?: boolean;
		requerido?: boolean;
	} = $props();

	let alta = $state<TransportistaRapido>();
	untrack(() => {
		if (campo.value() === undefined && inicial) campo.set(inicial);
	});
	const nombres = $derived(await getNombresTransportistas());
	const opciones = $derived.by<Option[]>(() => {
		const lista: Option[] = [
			...nombres.map((nombre) => ({ value: nombre, label: nombre })),
			{ value: RETIRA_EN_FABRICA, label: RETIRA_EN_FABRICA, detalle: 'El cliente lo busca' }
		];
		const actual = String(campo.value() ?? '').trim();
		const existe = lista.some((opcion) => opcion.value.toLowerCase() === actual.toLowerCase());
		return actual && !existe ? [{ value: actual, label: actual }, ...lista] : lista;
	});
	const puedeCrear = $derived(
		['contactos', 'pedidos', 'envios'].some((modulo) =>
			can(page.data.user, page.data.permisos, modulo, 'edit')
		) || can(page.data.user, page.data.permisos, 'contactos', 'create')
	);
</script>

<SearchSelect
	{id}
	{label}
	options={opciones}
	field={campo}
	placeholder="Buscá o elegí el transportista..."
	required={requerido}
	{disabled}
	onCreate={puedeCrear && !disabled ? (texto) => alta?.abrir(texto) : undefined}
	createLabel="Agregar transportista"
/>

{#if puedeCrear && !disabled}
	<TransportistaRapido bind:this={alta} onCreado={(nombre) => campo.set(nombre)} />
{/if}
