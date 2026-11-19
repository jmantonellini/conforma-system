<script lang="ts">
	import { page } from '$app/state';
	import { Icono, Seccion } from '$lib/ui';
	import {
		ETIQUETA_FALTANTE,
		ETIQUETA_MODALIDAD,
		localidadCompleta,
		type DatosEntrega,
		type FaltanteEntrega,
		type OrigenEntrega
	} from '$lib/modulos/ventas/trabajo';
	import { can } from '$lib/utils/permissions';
	import EntregaDialog from './EntregaDialog.svelte';

	let {
		pedidoId,
		entrega,
		finalizado
	}: {
		pedidoId: number;
		entrega: { datos: DatosEntrega; origen: OrigenEntrega; faltan: FaltanteEntrega[] };
		finalizado: boolean;
	} = $props();

	let dialogo = $state<EntregaDialog>();
	const puedeEditar = $derived(
		can(page.data.user, page.data.permisos, 'pedidos', 'edit') ||
			can(page.data.user, page.data.permisos, 'envios', 'edit')
	);
	const datos = $derived(entrega.datos);
	const destino = $derived(
		[
			datos.modalidad && ETIQUETA_MODALIDAD[datos.modalidad],
			datos.direccion,
			localidadCompleta(datos)
		]
			.filter(Boolean)
			.join(' · ')
	);
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
				Faltan datos de entrega ({entrega.faltan.map((f) => ETIQUETA_FALTANTE[f]).join(' y ')}).
				Pedíselos al cliente ahora para despachar apenas esté terminado.
			</span>
		</div>
	{/if}
	{#if datos.consumidor_final}
		<div role="alert" class="mb-3 alert flex items-start alert-soft py-2 text-sm alert-info">
			<Icono nombre="camion" class="size-4" />
			<span><strong>Despachar declarado como consumidor final.</strong></span>
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
			{#if destino}
				<div>
					<dt class="secundario">Destino</dt>
					<dd>{destino}</dd>
				</div>
			{/if}
			{#if datos.recibe || datos.telefono}
				<div>
					<dt class="secundario">Recibe</dt>
					<dd>{[datos.recibe, datos.telefono].filter(Boolean).join(' · ')}</dd>
				</div>
			{/if}
			{#if datos.indicaciones}
				<div>
					<dt class="secundario">Indicaciones</dt>
					<dd class="whitespace-pre-line">{datos.indicaciones}</dd>
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
