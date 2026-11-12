<script lang="ts">
	import { Can, EstadoBadge, FormErrors, Modal, FormFieldWrapper, Seccion } from '$lib/ui';
	import {
		crearEnvio,
		marcarEntregado,
		getTransportistas,
		getEnviosByPedido
	} from '$lib/modulos/pedidos/envios.remote';
	import { toast } from '$lib/ui/toast.svelte';
	import { ESTADO_ENVIO } from '$lib/modulos/pedidos/tipos';

	let { pedidoId }: { pedidoId: number } = $props();

	let envios = $derived(await getEnviosByPedido(pedidoId));
	let transportistas = $derived(await getTransportistas());

	let showModal = $state(false);
	const form = crearEnvio;

	function cerrar() {
		showModal = false;
		form.element?.reset();
	}
</script>

<Seccion titulo="Envíos">
	{#snippet acciones()}
		<Can modulo="pedidos" accion="edit">
			<button class="btn btn-sm" onclick={() => (showModal = true)}>+ Registrar</button>
		</Can>
	{/snippet}
	{#if envios.length}
		<ul class="list -mx-4 sm:-mx-5">
			{#each envios as envio (envio.id)}
				{@const entregado = envio.estado === ESTADO_ENVIO.ENTREGADO}
				<li class="list-row items-center">
					<div>
						<p class="font-medium">{envio.transportista}</p>
						<p class="text-xs text-base-content/60">
							Guía {envio.numero_guia || '-'} · {envio.cantidad_bultos} bultos
						</p>
					</div>
					<EstadoBadge
						class="badge-sm capitalize"
						estado={{ nombre: envio.estado, color: entregado ? 'success' : 'warning' }}
					/>
					{#if !entregado}
						<Can modulo="pedidos" accion="edit">
							<button
								class="btn btn-xs"
								onclick={async () => {
									await marcarEntregado(String(envio.id));
									toast.success('Envío marcado como entregado');
								}}>Entregado</button
							>
						</Can>
					{/if}
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
		<FormFieldWrapper label="Transportista" id="transportista_id" required>
			<select class="select" {...form.fields.transportista_id.as('select')}>
				<option value="">Seleccionar...</option>
				{#each transportistas as t (t.id)}
					<option value={String(t.id)}>{t.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
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
