<script lang="ts">
	import { FormErrors, FormFieldWrapper, Modal } from '$lib/ui';
	import { ajustarPrecio } from '$lib/modulos/pedidos/facturacion.remote';
	import { totalAjustado, type TipoAjuste } from '$lib/modulos/pedidos/pagos';
	import { toast } from '$lib/ui/toast.svelte';
	import { SIMBOLO_MONEDA, type Moneda } from '$lib/utils/moneda';
	import { formatearMoneda } from '$lib/utils/precios';

	let {
		pedidoId,
		moneda,
		total,
		saldo
	}: { pedidoId: number; moneda: Moneda; total: number; saldo: number } = $props();

	let abierto = $state(false);
	const form = ajustarPrecio;

	const tipo = $derived((form.fields.tipo.value() || 'recargo') as TipoAjuste);
	const monto = $derived(Number(form.fields.monto.value()) || 0);
	const nuevoTotal = $derived(totalAjustado(total, tipo, monto));
	const nuevoSaldo = $derived(nuevoTotal - total + saldo);

	export function abrir() {
		abierto = true;
	}

	function cerrar() {
		abierto = false;
		form.element?.reset();
	}
</script>

<Modal
	bind:open={abierto}
	titulo="Ajustar precio del pedido"
	alCerrar={cerrar}
	accion={{ etiqueta: 'Aplicar ajuste', form: 'ajuste-form', pendiente: !!form.pending }}
>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				toast.success('Precio ajustado');
				cerrar();
			}
		})}
		id="ajuste-form"
	>
		<input type="hidden" name="pedido_id" value={pedidoId} />
		<p class="text-sm text-base-content/70">
			Cambia lo que se le cobra al cliente sin tocar la cotización ni las líneas del pedido.
		</p>
		<div class="join w-full">
			<input
				class="btn join-item flex-1 btn-sm"
				aria-label="Recargo"
				{...form.fields.tipo.as('radio', 'recargo')}
				checked={tipo === 'recargo'}
			/>
			<input
				class="btn join-item flex-1 btn-sm"
				aria-label="Descuento"
				{...form.fields.tipo.as('radio', 'descuento')}
			/>
		</div>
		<FormFieldWrapper label={`Monto (${SIMBOLO_MONEDA[moneda]})`} id="monto_ajuste" required>
			<input
				id="monto_ajuste"
				class="input w-full"
				min="0.01"
				step="0.01"
				required
				{...form.fields.monto.as('number')}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper label="Motivo" id="motivo_ajuste" required>
			<input
				id="motivo_ajuste"
				class="input w-full"
				maxlength="200"
				required
				placeholder={tipo === 'recargo'
					? 'Ej: flete, trabajo adicional'
					: 'Ej: redondeo, bonificación'}
				{...form.fields.motivo.as('text')}
			/>
		</FormFieldWrapper>
		<dl class="grid grid-cols-2 gap-2 rounded-box bg-base-200 p-3 text-sm">
			<div>
				<dt class="text-base-content/60">Total</dt>
				<dd class="tabular-nums">
					{formatearMoneda(total, moneda)}
					{#if monto}→ <strong>{formatearMoneda(nuevoTotal, moneda)}</strong>{/if}
				</dd>
			</div>
			<div>
				<dt class="text-base-content/60">Saldo</dt>
				<dd class="tabular-nums">
					{formatearMoneda(saldo, moneda)}
					{#if monto}→ <strong>{formatearMoneda(nuevoSaldo, moneda)}</strong>{/if}
				</dd>
			</div>
		</dl>
		<FormErrors {form} />
	</form>
</Modal>
