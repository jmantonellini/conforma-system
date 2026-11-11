<script lang="ts">
	import {
		Can,
		EstadoBadge,
		FormErrors,
		Modal,
		FormFieldWrapper,
		Seccion
	} from '$lib/components/ui';
	import {
		crearEnvio,
		marcarEntregado,
		getTransportistas,
		getEnviosByPedido
	} from '$lib/remote/envios.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { ESTADO_ENVIO } from '$lib/types/dominio';

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

<Modal bind:open={showModal} title="Registrar Envío" onClose={cerrar}>
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

		<div class="grid gap-3">
			<FormFieldWrapper label="Transportista" id="transportista_id" required>
				<select class="select" {...form.fields.transportista_id.as('select')}>
					<option value="">Seleccionar...</option>
					{#each transportistas as t (t.id)}
						<option value={String(t.id)}>{t.nombre}</option>
					{/each}
				</select>
			</FormFieldWrapper>

			<FormFieldWrapper label="N° Guía" id="numero_guia">
				<input class="input" {...form.fields.numero_guia.as('text')} />
			</FormFieldWrapper>

			<FormFieldWrapper label="Bultos" id="cantidad_bultos">
				<input class="input" {...form.fields.cantidad_bultos.as('number')} />
			</FormFieldWrapper>

			<FormFieldWrapper label="Observaciones" id="observaciones">
				<textarea class="textarea" rows="2" {...form.fields.observaciones.as('text')}></textarea>
			</FormFieldWrapper>
		</div>
		<FormErrors {form} />
	</form>

	{#snippet actions()}
		<button class="btn" onclick={cerrar}>Cancelar</button>
		<Can modulo="pedidos" accion="edit">
			<button type="submit" form="envio-form" class="btn btn-primary" disabled={!!form.pending}>
				{form.pending ? 'Registrando...' : 'Registrar'}
			</button>
		</Can>
	{/snippet}
</Modal>
