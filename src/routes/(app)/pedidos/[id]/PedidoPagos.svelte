<script lang="ts">
	import { Can, FormErrors, Modal, FormFieldWrapper } from '$lib/components/ui';
	import { getPagosByPedido, registrarPago } from '$lib/remote/facturacion.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatearFecha } from '$lib/utils/fechas';
	import { formatearDosDecimales, redondearPrecio } from '$lib/utils/precios';

	let { pedidoId }: { pedidoId: number } = $props();

	let facturacion = $derived(await getPagosByPedido(pedidoId));
	let showModal = $state(false);
	const form = registrarPago;

	function cerrar() {
		showModal = false;
		form.element?.reset();
	}

	function completarSaldoRestante() {
		form.fields.monto.set(redondearPrecio(Math.max(facturacion.saldo, 0)));
	}

	const items = $derived(facturacion.pagos ?? []);
</script>

<div class="card w-full bg-base-100 shadow">
	<div class="card-body">
		<div class="flex items-center justify-between">
			<h3 class="card-title">Pagos</h3>
			<Can modulo="pedidos" accion="edit">
				<button class="btn btn-primary btn-sm" onclick={() => (showModal = true)}>
					+ Registrar pago
				</button>
			</Can>
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
						>Saldo: ${formatearDosDecimales(facturacion.saldo)}</span
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
							<p class="font-semibold">${formatearDosDecimales(pago.monto)}</p>
							<p class="text-sm text-base-content/70 capitalize">
								<span>
									{pago.metodo_pago === 'cuotas'
										? 'Tarjeta de crédito'
										: pago.metodo_pago || 'Sin método'}
								</span>
								{#if pago.cantidad_cuotas}
									<span>· {pago.cantidad_cuotas} cuotas</span>
								{/if}
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
				<div class="join w-full">
					<input
						class="remove-arrow input join-item min-w-0 flex-1"
						step="0.01"
						{...form.fields.monto.as('number')}
					/>
					<button
						type="button"
						class="btn join-item btn-outline"
						disabled={facturacion.saldo <= 0}
						onclick={completarSaldoRestante}
					>
						Saldo restante
					</button>
				</div>
			</FormFieldWrapper>
			<FormFieldWrapper label="Método" id="metodo_pago">
				<select class="select" {...form.fields.metodo_pago.as('select', 'efectivo')}>
					<option value="efectivo">Efectivo</option>
					<option value="transferencia">Transferencia</option>
					<option value="cheque">Cheque</option>
					<option value="cuotas">Tarjeta en cuotas</option>
				</select>
			</FormFieldWrapper>
			{#if form.fields.metodo_pago.value() === 'cuotas'}
				<FormFieldWrapper label="Cantidad de cuotas" id="cantidad_cuotas" required>
					<input
						class="remove-arrow input"
						min="1"
						step="1"
						required
						{...form.fields.cantidad_cuotas.as('number')}
					/>
				</FormFieldWrapper>
			{/if}
			<FormFieldWrapper label="Observaciones" id="observaciones">
				<textarea class="textarea" rows="2" {...form.fields.observaciones.as('text')}></textarea>
			</FormFieldWrapper>
		</div>
		<FormErrors {form} />
	</form>

	{#snippet actions()}
		<button class="btn" onclick={cerrar}>Cancelar</button>
		<Can modulo="pedidos" accion="edit">
			<button type="submit" form="pago-form" class="btn btn-primary" disabled={!!form.pending}>
				{form.pending ? 'Registrando...' : 'Registrar'}
			</button>
		</Can>
	{/snippet}
</Modal>
