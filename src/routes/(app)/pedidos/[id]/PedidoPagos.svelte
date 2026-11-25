<script lang="ts">
	import {
		Can,
		EstadoBadge,
		FormErrors,
		Modal,
		FormFieldWrapper,
		MenuDesplegable,
		Seccion
	} from '$lib/ui';
	import Icono from '$lib/ui/Icono.svelte';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import {
		eliminarPago,
		getPagosByPedido,
		registrarPago
	} from '$lib/modulos/pedidos/facturacion.remote';
	import { getDolarBNA } from '$lib/modulos/ventas/moneda.remote';
	import { montoAplicado, requiereTipoCambio, saldoEnMoneda } from '$lib/modulos/pedidos/pagos';
	import { toast } from '$lib/ui/toast.svelte';
	import { fechaInput, formatearFecha } from '$lib/utils/fechas';
	import { formatearDosDecimales, formatearMoneda } from '$lib/utils/precios';
	import {
		NOMBRE_MONEDA,
		SIMBOLO_MONEDA,
		TIPO_CAMBIO_MINIMO,
		type Moneda
	} from '$lib/utils/moneda';
	import { ESTADO_PAGO, METODO_PAGO } from '$lib/modulos/pedidos/tipos';
	import AjustePrecioDialog from './AjustePrecioDialog.svelte';

	let { pedidoId }: { pedidoId: number } = $props();

	let facturacion = $derived(await getPagosByPedido(pedidoId));
	let dolar = $derived(await getDolarBNA());
	let showModal = $state(false);
	let editando = $state<Pago | null>(null);
	let dialogoAjuste = $state<AjustePrecioDialog>();
	const form = registrarPago;

	type Pago = (typeof facturacion.pagos)[number];

	const monedaPedido = $derived(facturacion.moneda);
	const saldoDisponible = $derived(facturacion.saldo + (editando?.monto_aplicado ?? 0));
	const monedaPago = $derived((form.fields.moneda.value() || 'ARS') as Moneda);
	const conCambio = $derived(requiereTipoCambio(monedaPago, monedaPedido));
	const cambioSugerido = $derived(dolar?.venta ?? facturacion.tipo_cambio_pedido ?? undefined);
	const tipoCambio = $derived(Number(form.fields.tipo_cambio.value()) || cambioSugerido);
	const saldoEnPesos = $derived(
		monedaPedido === 'USD' && cambioSugerido
			? saldoEnMoneda(facturacion.saldo, 'USD', 'ARS', cambioSugerido)
			: null
	);
	const equivalente = $derived.by(() => {
		const monto = Number(form.fields.monto.value());
		if (!conCambio || !monto || !tipoCambio) return null;
		return montoAplicado({ monto, moneda: monedaPago, tipo_cambio: tipoCambio }, monedaPedido);
	});
	const diferencia = $derived.by(() => {
		const monto = Number(form.fields.monto.value());
		const aplicado = conCambio ? equivalente : monto;
		if (!monto || aplicado === null) return 0;
		const resto = saldoDisponible - aplicado;
		return resto > 0.01 ? resto : 0;
	});

	function cerrar() {
		showModal = false;
		editando = null;
		form.element?.reset();
	}

	function editar(pago: Pago) {
		editando = pago;
		form.fields.moneda.set(pago.moneda);
		form.fields.monto.set(pago.monto);
		if (pago.tipo_cambio) form.fields.tipo_cambio.set(pago.tipo_cambio);
		form.fields.fecha_pago.set(fechaInput(pago.fecha_pago ?? pago.created_at ?? new Date()));
		form.fields.metodo_pago.set(
			(pago.metodo_pago ?? METODO_PAGO.EFECTIVO) as typeof METODO_PAGO.EFECTIVO
		);
		if (pago.cantidad_cuotas) form.fields.cantidad_cuotas.set(pago.cantidad_cuotas);
		form.fields.recibo.set(pago.recibo ?? '');
		form.fields.observaciones.set(pago.observaciones ?? '');
		showModal = true;
	}

	function eliminar(pago: Pago) {
		confirmarYEjecutar({
			titulo: 'Eliminar pago',
			mensaje: `Se elimina el pago de ${formatearMoneda(pago.monto, pago.moneda)} y el saldo del pedido vuelve a subir. Queda registrado en el historial.`,
			ejecutar: () => eliminarPago({ pedido_id: pedidoId, pago_id: pago.id }),
			exito: 'Pago eliminado'
		});
	}

	function completarSaldoRestante() {
		const saldo = saldoEnMoneda(
			Math.max(saldoDisponible, 0),
			monedaPedido,
			monedaPago,
			conCambio ? tipoCambio : null
		);
		if (saldo !== null) form.fields.monto.set(saldo);
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
			<button class="btn btn-ghost btn-sm" onclick={() => dialogoAjuste?.abrir()}>
				Ajustar precio
			</button>
			<button class="btn btn-sm" onclick={() => (showModal = true)}>+ Registrar</button>
		</Can>
	{/snippet}
	{#if facturacion.historico && facturacion.estado !== ESTADO_PAGO.PAGADO}
		<p class="text-sm text-base-content/70">
			Pedido importado del histórico. La planilla no tenía el importe de todos los cobros: los que
			faltan figuran en las observaciones.
		</p>
	{:else}
		<div class="flex items-start justify-between gap-2">
			<EstadoBadge estado={ESTADOS[facturacion.estado]} />
			{#if facturacion.saldo > 0}
				<div class="text-right text-sm text-base-content/70">
					<p>Saldo {formatearMoneda(facturacion.saldo, monedaPedido)}</p>
					{#if saldoEnPesos !== null}
						<p class="text-xs text-base-content/60">
							≈ {formatearMoneda(saldoEnPesos, 'ARS')} al dólar {formatearDosDecimales(
								cambioSugerido
							)}
						</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
	{#if items.length}
		<ul class="list -mx-4 sm:-mx-5">
			{#each items as pago (pago.id)}
				<li class="list-row">
					<div>
						<p class="font-medium tabular-nums">{formatearMoneda(pago.monto, pago.moneda)}</p>
						{#if pago.moneda !== monedaPedido}
							<p class="text-xs text-base-content/60 tabular-nums">
								= {formatearMoneda(pago.monto_aplicado, monedaPedido)}
								{#if pago.tipo_cambio}· TC {formatearDosDecimales(pago.tipo_cambio)}{/if}
							</p>
						{/if}
					</div>
					<div class="list-col-wrap text-sm text-base-content/70">
						<p class="capitalize">
							{pago.metodo_pago === METODO_PAGO.CUOTAS
								? `Tarjeta · ${pago.cantidad_cuotas} cuotas`
								: pago.metodo_pago || 'Sin método'}
							{#if pago.recibo}<span class="normal-case"> · Recibo {pago.recibo}</span>{/if}
						</p>
						<p class="text-xs">{formatearFecha(pago.fecha_pago)} {pago.observaciones ?? ''}</p>
					</div>
					<Can modulo="pedidos" accion="edit">
						<MenuDesplegable
							alFinal
							class="btn btn-square btn-ghost btn-xs"
							titulo="Acciones del pago"
						>
							{#snippet etiqueta()}<Icono nombre="mas" />{/snippet}
							<li><button onclick={() => editar(pago)}>Editar</button></li>
							<li><button class="text-error" onclick={() => eliminar(pago)}>Eliminar</button></li>
						</MenuDesplegable>
					</Can>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/60">Sin pagos registrados</p>
	{/if}
</Seccion>

<Modal
	bind:open={showModal}
	titulo={editando ? 'Editar pago' : 'Registrar pago'}
	alCerrar={cerrar}
	accion={{
		etiqueta: editando ? 'Guardar cambios' : 'Registrar pago',
		form: 'pago-form',
		pendiente: !!form.pending
	}}
>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				toast.success(editando ? 'Pago actualizado' : 'Pago registrado');
				cerrar();
			}
		})}
		id="pago-form"
	>
		<input type="hidden" name="pedido_id" value={pedidoId} />
		{#if editando}
			<input type="hidden" name="pago_id" value={editando.id} />
		{/if}
		<div class="grid gap-4 sm:grid-cols-[8rem_1fr]">
			<FormFieldWrapper label="Moneda" id="moneda">
				<select id="moneda" class="select" {...form.fields.moneda.as('select', 'ARS')}>
					<option value="ARS">{NOMBRE_MONEDA.ARS}</option>
					<option value="USD">{NOMBRE_MONEDA.USD}</option>
				</select>
			</FormFieldWrapper>
			<FormFieldWrapper label={`Monto (${SIMBOLO_MONEDA[monedaPago]})`} id="monto" required>
				<div class="join w-full">
					<input
						id="monto"
						class="input join-item min-w-0 flex-1"
						step="0.01"
						{...form.fields.monto.as('number')}
					/>
					<button
						type="button"
						class="btn join-item"
						disabled={saldoDisponible <= 0 || (conCambio && !tipoCambio)}
						onclick={completarSaldoRestante}
					>
						Saldo restante
					</button>
				</div>
			</FormFieldWrapper>
		</div>
		{#if conCambio}
			<FormFieldWrapper
				label="Tipo de cambio (US$ 1 = $)"
				id="tipo_cambio"
				required
				ayuda={equivalente !== null
					? `Se descuentan ${formatearMoneda(equivalente, monedaPedido)} del saldo del pedido`
					: dolar
						? `Dólar BNA vendedor del ${dolar.fecha}`
						: undefined}
			>
				<input
					id="tipo_cambio"
					class="input w-full"
					step="0.0001"
					min={TIPO_CAMBIO_MINIMO}
					required
					{...form.fields.tipo_cambio.as('number', cambioSugerido ?? '')}
				/>
			</FormFieldWrapper>
		{/if}
		<div class="grid gap-4 sm:grid-cols-2">
			<FormFieldWrapper label="Fecha del pago" id="fecha_pago">
				<input
					id="fecha_pago"
					class="input w-full"
					{...form.fields.fecha_pago.as('date', fechaInput())}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper label="Método" id="metodo_pago">
				<select
					id="metodo_pago"
					class="select"
					{...form.fields.metodo_pago.as('select', METODO_PAGO.EFECTIVO)}
				>
					<option value={METODO_PAGO.EFECTIVO}>Efectivo</option>
					<option value={METODO_PAGO.TRANSFERENCIA}>Transferencia</option>
					<option value={METODO_PAGO.CHEQUE}>Cheque</option>
					<option value={METODO_PAGO.CUOTAS}>Tarjeta en cuotas</option>
				</select>
			</FormFieldWrapper>
			{#if form.fields.metodo_pago.value() === METODO_PAGO.CUOTAS}
				<FormFieldWrapper label="Cuotas" id="cantidad_cuotas" required>
					<input
						id="cantidad_cuotas"
						class="input"
						min="1"
						step="1"
						required
						{...form.fields.cantidad_cuotas.as('number')}
					/>
				</FormFieldWrapper>
			{/if}
		</div>
		{#if diferencia > 0}
			<label class="label items-start gap-2 text-sm whitespace-normal">
				<input
					class="checkbox mt-0.5 checkbox-sm"
					{...form.fields.bonificar_diferencia.as('checkbox')}
				/>
				<span>
					Bonificar la diferencia de <strong>{formatearMoneda(diferencia, monedaPedido)}</strong>
					<span class="block text-xs text-base-content/60">
						Se descuenta del total y el pedido queda pagado, sin deuda.
					</span>
				</span>
			</label>
		{/if}
		<FormFieldWrapper
			label="Recibo"
			id="recibo"
			ayuda="Código del recibo en el sistema de facturación"
		>
			<input
				id="recibo"
				class="input w-full"
				maxlength="100"
				placeholder="Ej: X-0001-00000456"
				{...form.fields.recibo.as('text')}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper label="Observaciones" id="observaciones">
			<textarea
				id="observaciones"
				class="textarea"
				rows="2"
				{...form.fields.observaciones.as('text')}></textarea>
		</FormFieldWrapper>
		<FormErrors {form} />
	</form>
</Modal>

<AjustePrecioDialog
	bind:this={dialogoAjuste}
	{pedidoId}
	moneda={monedaPedido}
	total={facturacion.total}
	saldo={facturacion.saldo}
/>
