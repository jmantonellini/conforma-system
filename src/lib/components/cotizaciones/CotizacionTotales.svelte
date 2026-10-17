<script lang="ts">
	import { Can } from '$lib/components/ui';
	import { formatearDosDecimales } from '$lib/utils/precios';

	type Props = {
		bloqueada: boolean;
		guardando: boolean;
		validezDias: number;
		incluirIva: boolean;
		descuentoGlobal: number;
		totalCalculado: number;
		totalFinal: number;
		precioTotalIngresado: string | null;
		condicionesPago: string;
		onCambiarValidez: (dias: number) => void;
		onCambiarIva: (incluir: boolean) => void;
		onCambiarDescuento: (porcentaje: number) => void;
		onActualizarTotal: (valor: string) => void;
		onFinalizarEdicionTotal: () => void;
		onCambiarCondiciones: (condiciones: string) => void;
		onGuardar: () => void;
	};

	let {
		bloqueada,
		guardando,
		validezDias,
		incluirIva,
		descuentoGlobal,
		totalCalculado,
		totalFinal,
		precioTotalIngresado,
		condicionesPago,
		onCambiarValidez,
		onCambiarIva,
		onCambiarDescuento,
		onActualizarTotal,
		onFinalizarEdicionTotal,
		onCambiarCondiciones,
		onGuardar
	}: Props = $props();
</script>

<div class="flex flex-wrap items-center justify-end gap-4">
	<label class="flex items-center gap-2 text-sm">
		Validez (días)
		<input
			class="remove-arrow input w-20 input-sm"
			type="number"
			min="1"
			value={validezDias}
			oninput={(event) => onCambiarValidez(Number(event.currentTarget.value) || 1)}
		/>
	</label>
	<label class="label cursor-pointer gap-2">
		<input
			class="checkbox checkbox-sm"
			type="checkbox"
			checked={incluirIva}
			disabled={bloqueada}
			onchange={(event) => onCambiarIva(event.currentTarget.checked)}
		/>
		<span>Agregar IVA 21%</span>
	</label>
	<Can modulo="cotizaciones" accion="descuento">
		<label for="descuento-global" class="flex items-center gap-2 text-sm">
			Descuento general (%)
			<input
				id="descuento-global"
				class="remove-arrow input w-24 text-right input-sm"
				type="number"
				min="0"
				max="99.99"
				step="0.01"
				disabled={bloqueada}
				value={descuentoGlobal}
				oninput={(event) =>
					onCambiarDescuento(Math.min(Math.max(Number(event.currentTarget.value) || 0, 0), 99.99))}
			/>
		</label>
	</Can>
	<div class="flex items-center gap-2">
		<label class="flex items-center gap-3 text-sm font-semibold">
			<span>Total final</span>
			<input
				class={[
					'remove-arrow input w-40 text-right text-lg font-bold input-sm',
					{ 'input-error': totalFinal < totalCalculado }
				]}
				type="number"
				min="0"
				step="0.01"
				aria-label="Precio final de la cotización"
				value={precioTotalIngresado ?? totalFinal.toFixed(2)}
				oninput={(event) => onActualizarTotal(event.currentTarget.value)}
				onblur={onFinalizarEdicionTotal}
			/>
		</label>
		{#if totalFinal < totalCalculado}
			<div
				class="tooltip tooltip-bottom"
				data-tip={`El total final está por debajo de la base de cotización (${formatearDosDecimales(totalCalculado)}).`}
			>
				<button
					type="button"
					class="btn btn-circle btn-outline btn-error btn-xs"
					aria-label="El total final está por debajo de la base de venta"
				>
					!
				</button>
			</div>
		{/if}
	</div>
	<button class="btn btn-primary btn-sm" disabled={bloqueada || guardando} onclick={onGuardar}>
		{guardando ? 'Guardando...' : bloqueada ? 'Convertida en pedido' : 'Guardar cotización'}
	</button>
</div>
<label class="fieldset w-full">
	<span class="fieldset-legend">Condiciones de pago</span>
	<textarea
		class="textarea w-full resize-none"
		rows="2"
		maxlength="1000"
		disabled={bloqueada}
		value={condicionesPago}
		oninput={(event) => onCambiarCondiciones(event.currentTarget.value)}
		placeholder="Transferencia, tarjeta de crédito en cuotas, anticipo y saldo..."
	></textarea>
</label>
