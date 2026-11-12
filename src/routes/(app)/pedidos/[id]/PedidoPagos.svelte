<script lang="ts">
	import { Can, EstadoBadge, FormErrors, Modal, FormFieldWrapper, Seccion } from '$lib/ui';
	import { getPagosByPedido, registrarPago } from '$lib/modulos/pedidos/facturacion.remote';
	import { toast } from '$lib/ui/toast.svelte';
	import { formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda, redondearPrecio } from '$lib/utils/precios';
	import { ESTADO_PAGO, METODO_PAGO } from '$lib/modulos/pedidos/tipos';

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
	const ESTADOS = {
		[ESTADO_PAGO.SIN_PAGAR]: { nombre: 'Sin pagar', color: 'neutral' },
		[ESTADO_PAGO.ANTICIPO]: { nombre: 'Solo anticipo', color: 'warning' },
		[ESTADO_PAGO.PARCIAL]: { nombre: 'Parcial', color: 'warning' },
		[ESTADO_PAGO.PAGADO]: { nombre: 'Pagado', color: 'success' }
	};
</script>

<Seccion titulo="Pagos">
	{#snippet acciones()}
		<Can modulo="pedidos" accion="edit">
			<button class="btn btn-sm" onclick={() => (showModal = true)}>+ Registrar</button>
		</Can>
	{/snippet}
	<div class="flex items-center justify-between gap-2">
		<EstadoBadge estado={ESTADOS[facturacion.estado]} />
		{#if facturacion.saldo > 0}
			<span class="text-sm text-base-content/70">Saldo {formatearMoneda(facturacion.saldo)}</span>
		{/if}
	</div>
	{#if items.length}
		<ul class="list -mx-4 sm:-mx-5">
			{#each items as pago (pago.id)}
				<li class="list-row">
					<div class="numero font-medium">{formatearMoneda(pago.monto)}</div>
					<div class="text-sm text-base-content/70">
						<p class="capitalize">
							{pago.metodo_pago === METODO_PAGO.CUOTAS
								? `Tarjeta · ${pago.cantidad_cuotas} cuotas`
								: pago.metodo_pago || 'Sin método'}
						</p>
						<p class="text-xs">{formatearFecha(pago.fecha_pago)} {pago.observaciones ?? ''}</p>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/60">Sin pagos registrados</p>
	{/if}
</Seccion>

<Modal
	bind:open={showModal}
	titulo="Registrar pago"
	alCerrar={cerrar}
	accion={{ etiqueta: 'Registrar pago', form: 'pago-form', pendiente: !!form.pending }}
>
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
		<FormFieldWrapper label="Monto" id="monto" required>
			<div class="join w-full">
				<input
					class="input join-item min-w-0 flex-1"
					step="0.01"
					{...form.fields.monto.as('number')}
				/>
				<button
					type="button"
					class="btn join-item"
					disabled={facturacion.saldo <= 0}
					onclick={completarSaldoRestante}
				>
					Saldo restante
				</button>
			</div>
		</FormFieldWrapper>
		<div class="grid gap-4 sm:grid-cols-2">
			<FormFieldWrapper label="Método" id="metodo_pago">
				<select class="select" {...form.fields.metodo_pago.as('select', METODO_PAGO.EFECTIVO)}>
					<option value={METODO_PAGO.EFECTIVO}>Efectivo</option>
					<option value={METODO_PAGO.TRANSFERENCIA}>Transferencia</option>
					<option value={METODO_PAGO.CHEQUE}>Cheque</option>
					<option value={METODO_PAGO.CUOTAS}>Tarjeta en cuotas</option>
				</select>
			</FormFieldWrapper>
			{#if form.fields.metodo_pago.value() === METODO_PAGO.CUOTAS}
				<FormFieldWrapper label="Cuotas" id="cantidad_cuotas" required>
					<input
						class="input"
						min="1"
						step="1"
						required
						{...form.fields.cantidad_cuotas.as('number')}
					/>
				</FormFieldWrapper>
			{/if}
		</div>
		<FormFieldWrapper label="Observaciones" id="observaciones">
			<textarea class="textarea" rows="2" {...form.fields.observaciones.as('text')}></textarea>
		</FormFieldWrapper>
		<FormErrors {form} />
	</form>
</Modal>
