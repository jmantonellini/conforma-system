<script lang="ts">
	import { Modal, FormFieldWrapper } from '$lib/components/ui';
	import { getPagosByPedido, registrarPago } from '$lib/remote/facturacion.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatearFecha } from '$lib/utils/fechas';

	let { pedidoId }: { pedidoId: number } = $props();

	let facturacion = $derived(await getPagosByPedido(pedidoId));
	let showModal = $state(false);
	const form = registrarPago;

	function cerrar() {
		showModal = false;
		form.element?.reset();
	}

	const items = $derived(facturacion.pagos ?? []);
</script>

<div class="card w-full bg-base-100 shadow">
	<div class="card-body">
		<div class="flex items-center justify-between">
			<h3 class="card-title">Pagos</h3>
			<button class="btn btn-primary btn-sm" onclick={() => (showModal = true)}>
				+ Registrar pago
			</button>
		</div>

		{#if facturacion && typeof facturacion.estado === 'string'}
			<div class="mt-2 flex items-center justify-between gap-2">
				<span
					class="badge badge-{facturacion.estado === 'pagado'
						? 'success'
						: facturacion.estado === 'sin_pagar'
							? 'ghost'
							: 'warning'}"
				>
					{facturacion.estado === 'sin_pagar'
						? 'Sin pagar'
						: facturacion.estado === 'anticipo'
							? 'Solo anticipo'
							: facturacion.estado === 'parcial'
								? 'Parcial'
								: 'Pagado'}
				</span>
				{#if facturacion.saldo > 0}
					<span class="text-sm text-base-content/70"
						>Saldo: ${facturacion.saldo.toLocaleString()}</span
					>
				{/if}
			</div>
		{/if}
		<div class="flex flex-col gap-2">
			{#if items.length === 0}
				<p class="text-sm text-base-content/50">Sin pagos registrados</p>
			{:else}
				{#each items as pago (pago.id)}
					<div class="flex items-center justify-between rounded bg-base-200 p-3">
						<div>
							<p class="font-semibold">${pago.monto.toLocaleString()}</p>
							<p class="text-sm text-base-content/70 capitalize">
								<span>
									{pago.metodo_pago || 'Sin método'}
								</span>
								{#if pago.fecha_pago}
									<span class="text-xs text-base-content/50">
										- {formatearFecha(new Date(pago.fecha_pago))}
									</span>
								{/if}
								{#if pago.observaciones}
									- <span class="italic">{pago.observaciones}</span>
								{/if}
							</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<Modal bind:open={showModal} title="Registrar Pago" onClose={cerrar}>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				toast.success('Pago registrado');
				cerrar();
			}
		})}
		id="pago-form"
	>
		<input type="hidden" name="pedido_id" value={pedidoId} />
		<div class="grid gap-3">
			<FormFieldWrapper label="Monto" id="monto" required>
				<input class="input remove-arrow" step="0.01" {...form.fields.monto.as('number')} />
			</FormFieldWrapper>
			<FormFieldWrapper label="Método" id="metodo_pago">
				<select class="select" {...form.fields.metodo_pago.as('select', 'efectivo')}>
					<option value="efectivo">Efectivo</option>
					<option value="transferencia">Transferencia</option>
					<option value="cheque">Cheque</option>
				</select>
			</FormFieldWrapper>
			<FormFieldWrapper label="Observaciones" id="observaciones">
				<textarea class="textarea" rows="2" {...form.fields.observaciones.as('text')}></textarea>
			</FormFieldWrapper>
		</div>
	</form>

	{#snippet actions()}
		<button class="btn" onclick={cerrar}>Cancelar</button>
		<button type="submit" form="pago-form" class="btn btn-primary" disabled={!!form.pending}>
			{form.pending ? 'Registrando...' : 'Registrar'}
		</button>
	{/snippet}
</Modal>
