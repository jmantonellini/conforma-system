<script lang="ts">
	import { Modal } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { MONEDAS, NOMBRE_MONEDA, convertirEntreMonedas, type Moneda } from '$lib/utils/moneda';
	import { formatearDosDecimales, formatearMoneda, parsearNumeroDecimal } from '$lib/utils/precios';
	import { getDolarBNA } from '$lib/modulos/ventas/moneda.remote';

	type Cambio = { moneda: Moneda; modo: 'convertir' | 'corregir'; tipo_cambio: number };

	let {
		moneda,
		tipoCambio,
		total,
		onConfirmar
	}: {
		moneda: Moneda;
		tipoCambio: number | null;
		total: number | null;
		onConfirmar: (cambio: Cambio) => Promise<unknown>;
	} = $props();

	let open = $state(false);
	let destino = $state<Moneda>('USD');
	let modo = $state<Cambio['modo']>('convertir');
	let tipoCambioTexto = $state('');
	let guardando = $state(false);

	const tipoCambioNumero = $derived(parsearNumeroDecimal(tipoCambioTexto));
	const valido = $derived(tipoCambioNumero !== null && tipoCambioNumero > 0);
	const mismaMoneda = $derived(destino === moneda);
	const totalResultante = $derived(
		total === null || !valido
			? null
			: modo === 'convertir'
				? convertirEntreMonedas(total, moneda, destino, tipoCambioNumero!)
				: total
	);

	export async function abrir() {
		destino = moneda === 'USD' ? 'ARS' : 'USD';
		modo = 'convertir';
		tipoCambioTexto = tipoCambio ? formatearDosDecimales(tipoCambio) : '';
		open = true;
		if (!tipoCambio) {
			const dolar = await getDolarBNA().catch(() => null);
			if (dolar && !tipoCambioTexto) tipoCambioTexto = formatearDosDecimales(dolar.venta);
		}
	}

	async function confirmar() {
		if (!valido || guardando) return;
		guardando = true;
		try {
			await onConfirmar({
				moneda: destino,
				modo: mismaMoneda ? 'corregir' : modo,
				tipo_cambio: tipoCambioNumero!
			});
			toast.success('Moneda actualizada');
			open = false;
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo cambiar la moneda'));
		} finally {
			guardando = false;
		}
	}
</script>

<Modal
	bind:open
	titulo="Moneda del documento"
	descripcion={`Actualmente en ${NOMBRE_MONEDA[moneda].toLowerCase()}.`}
	ancho="sm"
	accion={{
		etiqueta: mismaMoneda ? 'Guardar tipo de cambio' : 'Cambiar moneda',
		onclick: confirmar,
		pendiente: guardando,
		deshabilitada: !valido
	}}
>
	<div class="flex flex-col gap-4">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Nueva moneda</legend>
			<div class="join w-full">
				{#each MONEDAS as opcion (opcion)}
					<input
						class="btn join-item flex-1"
						type="radio"
						name="moneda-destino"
						aria-label={`${NOMBRE_MONEDA[opcion]} (${opcion})`}
						value={opcion}
						bind:group={destino}
					/>
				{/each}
			</div>
		</fieldset>

		{#if !mismaMoneda}
			<fieldset class="fieldset gap-2">
				<legend class="fieldset-legend">¿Qué hacemos con los importes?</legend>
				<label class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3">
					<input class="radio mt-0.5 radio-sm" type="radio" value="convertir" bind:group={modo} />
					<span>
						<span class="font-medium">Convertir importes</span>
						<span class="block text-sm text-base-content/60">
							El valor se mantiene; los números cambian al tipo de cambio indicado.
						</span>
					</span>
				</label>
				<label class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3">
					<input class="radio mt-0.5 radio-sm" type="radio" value="corregir" bind:group={modo} />
					<span>
						<span class="font-medium">Solo corregir la moneda</span>
						<span class="block text-sm text-base-content/60">
							Los números quedan iguales. Para cuando se cargó en la moneda equivocada.
						</span>
					</span>
				</label>
			</fieldset>
		{/if}

		<label class="fieldset">
			<span class="fieldset-legend">Tipo de cambio (pesos por US$ 1)</span>
			<input
				class="input w-full"
				inputmode="decimal"
				bind:value={tipoCambioTexto}
				placeholder="Ej.: 1.415,00"
			/>
			<span class="label">Por defecto, el del documento o el dólar BNA vendedor de hoy.</span>
		</label>

		{#if total !== null && totalResultante !== null && !mismaMoneda}
			<div class="flex items-center justify-between rounded-box bg-base-200 px-4 py-3 text-sm">
				<span class="tabular-nums">{formatearMoneda(total, moneda)}</span>
				<span class="text-base-content/50">→</span>
				<span class="font-semibold tabular-nums">{formatearMoneda(totalResultante, destino)}</span>
			</div>
		{/if}
	</div>
</Modal>
