<script lang="ts">
	import { Can } from '$lib/components/ui';
	import { formatearDosDecimales } from '$lib/utils/precios';

	type Props = {
		bloqueada: boolean;
		guardando: boolean;
		validezDias: number;
		totalFinal: number;
		precioTotalIngresado: string | null;
		totalValido: boolean;
		incluirIva: boolean;
		descuentoGlobal: number;
		cubreCostos: boolean;
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
		totalFinal,
		precioTotalIngresado,
		totalValido,
		incluirIva,
		descuentoGlobal,
		cubreCostos,
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
		<label class="flex items-center gap-2 text-sm font-semibold">
			<span>Total final</span>
			<input
				class="remove-arrow input w-40 text-right text-lg font-bold input-sm"
				type="text"
				inputmode="decimal"
				aria-label="Precio final de la cotización"
        class:input-error={!totalValido || !cubreCostos}
				value={precioTotalIngresado ?? formatearDosDecimales(totalFinal)}
				disabled={bloqueada}
				oninput={(event) => onActualizarTotal(event.currentTarget.value)}
				onblur={onFinalizarEdicionTotal}
			/>
		</label>
		{#if !cubreCostos || !totalValido}
			<div
				class="tooltip tooltip-bottom"
				data-tip={!totalValido
					? 'Ingresá un total válido con hasta dos decimales.'
					: 'El neto de la cotización no cubre los costos.'}
			>
				<button
					type="button"
					class="btn btn-circle btn-outline btn-error btn-xs"
					aria-label={!totalValido
						? 'Ingresá un total válido con hasta dos decimales'
						: 'El neto de la cotización no cubre los costos'}
				>
					!
				</button>
			</div>
		{/if}
		<button
			class="btn btn-primary btn-sm"
			disabled={bloqueada || guardando}
			title={!cubreCostos ? 'El neto debe cubrir el costo de los materiales' : undefined}
			onclick={onGuardar}
		>
			{guardando ? 'Guardando...' : bloqueada ? 'Convertida en pedido' : 'Guardar cotización'}
		</button>
	</div>
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
