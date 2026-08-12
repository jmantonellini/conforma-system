<script lang="ts">
	import { Modal, FormFieldWrapper } from '$lib/components/ui';
	import {
		crearEnvio,
		marcarEntregado,
		getTransportistas,
		getEnviosByPedido
	} from '$lib/remote/envios.remote';
	import { toast } from '$lib/stores/toast.svelte';

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

<div class="card w-full bg-base-100 shadow">
	<div class="card-body">
		<div class="flex items-center justify-between">
			<h3 class="card-title">Envíos</h3>
			<button class="btn btn-primary btn-sm" onclick={() => (showModal = true)}>
				+ Registrar envío
			</button>
		</div>

		{#if envios.length === 0}
			<p class="mt-2 text-sm text-base-content/50">Sin envíos registrados</p>
		{:else}
			{#each envios as envio (envio.id)}
				<div class="mt-2 flex items-center justify-between rounded bg-base-200 p-3">
					<div>
						<p class="font-semibold">{envio.transportista}</p>
						<p class="text-sm text-base-content/70">
							Guía: {envio.numero_guia || '-'} · Bultos: {envio.cantidad_bultos} ·
							<span
								class="badge badge-dash badge-sm capitalize badge-{envio.estado === 'entregado'
									? 'success'
									: 'warning'}"
							>
								{envio.estado}
							</span>
						</p>
					</div>
					{#if envio.estado !== 'entregado'}
						<button
							class="btn btn-sm btn-success"
							onclick={async () => {
								await marcarEntregado(String(envio.id));
								toast.success('Envío marcado como entregado');
							}}
						>
							Confirmar entrega
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

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
				<input class="input remove-arrow" {...form.fields.cantidad_bultos.as('number')} />
			</FormFieldWrapper>

			<FormFieldWrapper label="Observaciones" id="observaciones">
				<textarea class="textarea" rows="2" {...form.fields.observaciones.as('text')}></textarea>
			</FormFieldWrapper>
		</div>
	</form>

	{#snippet actions()}
		<button class="btn" onclick={cerrar}>Cancelar</button>
		<button type="submit" form="envio-form" class="btn btn-primary" disabled={!!form.pending}>
			{form.pending ? 'Registrando...' : 'Registrar'}
		</button>
	{/snippet}
</Modal>
