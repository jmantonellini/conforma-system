<script lang="ts">
	import { Can, EstadoBadge, FormErrors, Icono, Modal, FormFieldWrapper, Seccion } from '$lib/ui';
	import {
		crearEnvio,
		marcarEntregado,
		getEnviosByPedido
	} from '$lib/modulos/pedidos/envios.remote';
	import SelectTransportista from '$lib/modulos/pedidos/componentes/SelectTransportista.svelte';
	import {
		ETIQUETA_MODALIDAD,
		localidadCompleta,
		type DatosEntrega
	} from '$lib/modulos/ventas/trabajo';
	import { toast } from '$lib/ui/toast.svelte';
	import { ESTADO_ENVIO } from '$lib/modulos/pedidos/tipos';

	let { pedidoId, entrega }: { pedidoId: number; entrega: DatosEntrega } = $props();

	let envios = $derived(await getEnviosByPedido(pedidoId));

	let showModal = $state(false);
	const form = $derived(crearEnvio.for(String(pedidoId)));

	function cerrar() {
		showModal = false;
		form.element?.reset();
	}
</script>

<Seccion titulo="Envíos">
	{#snippet acciones()}
		<Can modulo="envios" accion="edit">
			<button class="btn btn-sm" onclick={() => (showModal = true)}>+ Registrar</button>
		</Can>
	{/snippet}
	{#if envios.length}
		<ul class="list -mx-4 sm:-mx-5">
			{#each envios as envio (envio.id)}
				{@const entregado = envio.estado === ESTADO_ENVIO.ENTREGADO}
				<li class="list-row items-center">
					<div class="list-col-grow min-w-0">
						<p class="truncate font-medium">{envio.transportista}</p>
						<p class="text-xs text-base-content/60">
							Guía {envio.numero_guia || '-'} · {envio.cantidad_bultos} bultos
						</p>
						{#if envio.observaciones}
							<p class="text-xs text-base-content/60">{envio.observaciones}</p>
						{/if}
					</div>
					<div class="list-col-wrap flex items-center gap-2">
						<EstadoBadge
							class="badge-sm capitalize"
							estado={{ nombre: envio.estado, color: entregado ? 'success' : 'warning' }}
						/>
						{#if !entregado}
							<Can modulo="envios" accion="edit">
								<button
									class="btn btn-xs"
									onclick={async () => {
										await marcarEntregado(String(envio.id));
										toast.success('Envío marcado como entregado');
									}}>Entregado</button
								>
							</Can>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/60">Sin envíos registrados</p>
	{/if}
</Seccion>

<Modal
	bind:open={showModal}
	titulo="Registrar envío"
	alCerrar={cerrar}
	accion={{ etiqueta: 'Registrar envío', form: 'envio-form', pendiente: !!form.pending }}
>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				toast.success('Envío registrado');
				cerrar();
			}
		})}
		id="envio-form"
	>
		<input type="hidden" name="pedido_id" value={pedidoId} />
		{#if entrega.consumidor_final}
			<div role="alert" class="mb-3 alert flex items-start alert-soft py-2 text-sm alert-info">
				<Icono nombre="camion" class="size-4" />
				<span><strong>Declarar el envío como consumidor final.</strong></span>
			</div>
		{/if}
		{#if entrega.indicaciones || entrega.localidad || entrega.direccion}
			<dl class="mb-3 flex flex-col gap-1 rounded-box bg-base-200 p-3 text-sm">
				{#if entrega.localidad || entrega.direccion}
					<div>
						<dt class="secundario inline">Destino:</dt>
						<dd class="inline">
							{[
								entrega.modalidad && ETIQUETA_MODALIDAD[entrega.modalidad],
								entrega.direccion,
								localidadCompleta(entrega)
							]
								.filter(Boolean)
								.join(' · ')}
						</dd>
					</div>
				{/if}
				{#if entrega.recibe || entrega.telefono}
					<div>
						<dt class="secundario inline">Recibe:</dt>
						<dd class="inline">{[entrega.recibe, entrega.telefono].filter(Boolean).join(' · ')}</dd>
					</div>
				{/if}
				{#if entrega.indicaciones}
					<div>
						<dt class="secundario inline">Indicaciones:</dt>
						<dd class="inline whitespace-pre-line">{entrega.indicaciones}</dd>
					</div>
				{/if}
			</dl>
		{/if}
		{#if showModal}
			<SelectTransportista
				id="transportista"
				campo={form.fields.transportista as never}
				inicial={entrega.transportista ?? ''}
				requerido
			/>
		{/if}
		<div class="grid gap-4 sm:grid-cols-2">
			<FormFieldWrapper label="N° de guía" id="numero_guia">
				<input class="input" {...form.fields.numero_guia.as('text')} />
			</FormFieldWrapper>
			<FormFieldWrapper label="Bultos" id="cantidad_bultos">
				<input class="input" {...form.fields.cantidad_bultos.as('number')} />
			</FormFieldWrapper>
		</div>
		<FormFieldWrapper label="Observaciones" id="observaciones">
			<textarea class="textarea" rows="2" {...form.fields.observaciones.as('text')}></textarea>
		</FormFieldWrapper>
		<FormErrors {form} />
	</form>
</Modal>
