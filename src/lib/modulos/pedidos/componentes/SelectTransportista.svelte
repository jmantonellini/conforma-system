<script lang="ts">
	import { Icono } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { agregarTransportista, getNombresTransportistas } from '../entrega.remote';

	type Campo = {
		as: (tipo: 'select', inicial: string) => Record<string, unknown>;
		set: (valor: string) => void;
		value: () => unknown;
	};

	let {
		id,
		campo,
		inicial = '',
		disabled = false,
		requerido = false
	}: {
		id: string;
		campo: Campo;
		inicial?: string;
		disabled?: boolean;
		requerido?: boolean;
	} = $props();

	const NUEVO = '__nuevo__';
	const nombres = $derived(await getNombresTransportistas());
	const opciones = $derived.by(() => {
		const actual = String(campo.value() ?? inicial ?? '').trim();
		const existe = nombres.some((nombre) => nombre.toLowerCase() === actual.toLowerCase());
		return actual && actual !== NUEVO && !existe ? [actual, ...nombres] : nombres;
	});

	let agregando = $state(false);
	let guardando = $state(false);
	let nuevo = $state('');
	let anterior: string | undefined;

	function elegir(evento: Event & { currentTarget: HTMLSelectElement }) {
		const valor = evento.currentTarget.value;
		if (valor !== NUEVO) {
			anterior = valor;
			return;
		}
		const previo = anterior ?? inicial;
		evento.currentTarget.value = previo;
		campo.set(previo);
		agregando = true;
	}

	async function agregar() {
		if (!nuevo.trim() || guardando) return;
		guardando = true;
		try {
			const nombre = await agregarTransportista(nuevo);
			campo.set(nombre);
			anterior = nombre;
			agregando = false;
			nuevo = '';
			toast.success(`${nombre} agregado a los transportistas`);
		} catch (causa) {
			toast.error(mensajeError(causa, 'No se pudo agregar el transportista'));
		} finally {
			guardando = false;
		}
	}
</script>

<select
	{id}
	class="select w-full"
	{disabled}
	required={requerido}
	{...campo.as('select', inicial)}
	onchange={elegir}
>
	<option value="">{requerido ? 'Elegí el transportista' : 'Sin definir'}</option>
	{#each opciones as nombre (nombre)}
		<option value={nombre}>{nombre}</option>
	{/each}
	{#if !disabled}
		<option value={NUEVO}>+ Agregar transportista...</option>
	{/if}
</select>
{#if agregando}
	<div class="join mt-2 w-full">
		<input
			class="input join-item w-full"
			placeholder="Nombre del transportista"
			aria-label="Nombre del transportista nuevo"
			bind:value={nuevo}
			{@attach (input) => input.focus()}
			onkeydown={(evento) => {
				if (evento.key === 'Enter') {
					evento.preventDefault();
					void agregar();
				}
				if (evento.key === 'Escape') agregando = false;
			}}
		/>
		<button
			type="button"
			class="btn join-item btn-primary"
			disabled={!nuevo.trim() || guardando}
			onclick={agregar}
		>
			{#if guardando}<span class="loading loading-xs loading-spinner"></span>{/if}
			Agregar
		</button>
		<button
			type="button"
			class="btn join-item btn-square btn-ghost"
			aria-label="Cancelar"
			onclick={() => (agregando = false)}
		>
			<Icono nombre="cerrar" />
		</button>
	</div>
{/if}
