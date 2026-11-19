<script lang="ts">
	import { page } from '$app/state';
	import { Icono, Seccion } from '$lib/ui';
	import type { DatosEntrega, OrigenEntrega } from '$lib/modulos/ventas/trabajo';
	import { can } from '$lib/utils/permissions';
	import EntregaDialog from './EntregaDialog.svelte';

	let {
		pedidoId,
		entrega,
		finalizado
	}: {
		pedidoId: number;
		entrega: { datos: DatosEntrega; origen: OrigenEntrega; faltan: string[] };
		finalizado: boolean;
	} = $props();

	let dialogo = $state<EntregaDialog>();
	const puedeEditar = $derived(
		can(page.data.user, page.data.permisos, 'pedidos', 'edit') ||
			can(page.data.user, page.data.permisos, 'envios', 'edit')
	);
	const datos = $derived(entrega.datos);
	const ETIQUETA_FALTANTE: Record<string, string> = {
		transportista: 'transportista',
		destino: 'destino'
	};
</script>

<Seccion titulo="Entrega">
	{#snippet acciones()}
		{#if puedeEditar}
			<button class="btn btn-sm" onclick={() => dialogo?.abrir()}>
				{entrega.origen ? 'Editar' : 'Cargar'}
			</button>
		{/if}
	{/snippet}
	{#if entrega.faltan.length && !finalizado}
		<div role="alert" class="mb-3 alert flex items-start alert-soft py-2 text-sm alert-warning">
			<Icono nombre="alerta" class="size-4" />
			<span>
				Faltan datos de entrega ({entrega.faltan
					.map((f) => ETIQUETA_FALTANTE[f] ?? f)
					.join(' y ')}). Pedíselos al cliente ahora para despachar apenas esté terminado.
			</span>
		</div>
	{/if}
	{#if entrega.origen}
		<dl class="flex flex-col gap-2 text-sm">
			{#if datos.transportista}
				<div>
					<dt class="secundario">Transportista</dt>
					<dd class="font-medium">{datos.transportista}</dd>
				</div>
			{/if}
			{#if datos.direccion || datos.localidad}
				<div>
					<dt class="secundario">Destino</dt>
					<dd>{[datos.direccion, datos.localidad].filter(Boolean).join(', ')}</dd>
				</div>
			{/if}
			{#if datos.recibe || datos.telefono}
				<div>
					<dt class="secundario">Recibe</dt>
					<dd>{[datos.recibe, datos.telefono].filter(Boolean).join(' · ')}</dd>
				</div>
			{/if}
		</dl>
		{#if entrega.origen === 'cliente'}
			<p class="secundario mt-2">Tomados de los datos del contacto.</p>
		{/if}
	{:else if !entrega.faltan.length || finalizado}
		<p class="text-sm text-base-content/60">Sin datos de entrega</p>
	{/if}
</Seccion>

{#if puedeEditar}
	<EntregaDialog bind:this={dialogo} {pedidoId} entrega={datos} origen={entrega.origen} />
{/if}
