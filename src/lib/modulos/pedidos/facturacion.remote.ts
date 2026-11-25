import { avisarPago } from './avisos.server';
import { error, invalid } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { db, type Tx } from '$lib/server/db';
import { estados, pagos, pedidos } from '$lib/server/db/schema';
import { and, desc, eq, sum } from 'drizzle-orm';
import * as v from 'valibot';
import { getCurrentUser } from '../configuracion/usuarios.remote';
import { getHistorialPedido, getPedidoById } from './pedidos.remote';
import { requirePermission } from '$lib/server/auth/permissions';
import { registrarAuditoria } from '$lib/server/auditoria';
import { ESTADO_PAGO, METODO_PAGO, PEDIDO_SLUG, type EstadoPago } from '$lib/modulos/pedidos/tipos';
import {
	TIPOS_AJUSTE,
	ajustarAlSaldo,
	montoAplicado,
	requiereTipoCambio,
	totalAjustado,
	type TipoAjuste
} from './pagos';
import { dolarBNA } from '../ventas/moneda.server';
import { MENSAJE_TIPO_CAMBIO, MONEDAS, TIPO_CAMBIO_MINIMO, type Moneda } from '$lib/utils/moneda';
import { fechaDesdeInput, fechaInput, formatearFecha } from '$lib/utils/fechas';
import { formatearDosDecimales, formatearMoneda, redondearPrecio } from '$lib/utils/precios';

const textoOpcional = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100)));

const idTexto = v.pipe(v.string(), v.transform(Number), v.number());

const RegistrarPagoSchema = v.object({
	pedido_id: idTexto,
	pago_id: v.optional(idTexto),
	monto: v.pipe(v.number(), v.gtValue(0, 'El monto debe ser mayor a cero')),
	moneda: v.optional(v.picklist(MONEDAS), 'ARS'),
	tipo_cambio: v.optional(v.pipe(v.number(), v.minValue(TIPO_CAMBIO_MINIMO, MENSAJE_TIPO_CAMBIO))),
	fecha_pago: v.optional(v.pipe(v.string(), v.isoDate('Ingresá una fecha válida'))),
	recibo: textoOpcional,
	metodo_pago: v.optional(
		v.picklist([
			METODO_PAGO.EFECTIVO,
			METODO_PAGO.TRANSFERENCIA,
			METODO_PAGO.CHEQUE,
			METODO_PAGO.CUOTAS
		])
	),
	cantidad_cuotas: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
	observaciones: v.optional(v.string()),
	bonificar_diferencia: v.optional(v.boolean(), false)
});

const AjustePrecioSchema = v.object({
	pedido_id: idTexto,
	tipo: v.picklist(TIPOS_AJUSTE),
	monto: v.pipe(v.number(), v.gtValue(0, 'El monto debe ser mayor a cero')),
	motivo: v.pipe(v.string(), v.trim(), v.nonEmpty('Indicá el motivo'), v.maxLength(200))
});

const FacturaSchema = v.object({
	pedido_id: idTexto,
	factura: textoOpcional
});

export const getPagosByPedido = query(v.number(), async (pedidoId) => {
	await requirePermission('pedidos', 'view');
	await requirePermission('importes', 'view');

	const [pagosRows, pedidoRow] = await Promise.all([
		db.select().from(pagos).where(eq(pagos.pedido_id, pedidoId)).orderBy(desc(pagos.created_at)),
		db
			.select({
				precio_total: pedidos.precio_total,
				anticipo: pedidos.anticipo,
				moneda: pedidos.moneda,
				tipo_cambio: pedidos.tipo_cambio,
				historico: pedidos.historico
			})
			.from(pedidos)
			.where(eq(pedidos.id, pedidoId))
			.then((r) => r[0])
	]);

	const totalPagado = redondearPrecio(
		(pedidoRow?.anticipo || 0) + pagosRows.reduce((s, p) => s + (p.monto_aplicado || 0), 0)
	);
	const saldo = redondearPrecio((pedidoRow?.precio_total || 0) - totalPagado);

	let estado: EstadoPago;
	if (saldo <= 0 && pedidoRow?.precio_total) {
		estado = ESTADO_PAGO.PAGADO;
	} else if (totalPagado === 0) {
		estado = ESTADO_PAGO.SIN_PAGAR;
	} else if (totalPagado === (pedidoRow?.anticipo || 0) && pagosRows.length === 0) {
		estado = ESTADO_PAGO.ANTICIPO;
	} else {
		estado = ESTADO_PAGO.PARCIAL;
	}

	return {
		pagos: pagosRows,
		totalPagado,
		saldo,
		estado,
		total: pedidoRow?.precio_total ?? 0,
		moneda: pedidoRow?.moneda ?? 'USD',
		tipo_cambio_pedido: pedidoRow?.tipo_cambio ?? null,
		historico: pedidoRow?.historico ?? false
	};
});

async function bloquearPedidoConSaldo(tx: Tx, pedidoId: number) {
	const [pedido] = await tx
		.select({
			id: pedidos.id,
			moneda: pedidos.moneda,
			precio_total: pedidos.precio_total,
			anticipo: pedidos.anticipo,
			estado: estados.slug
		})
		.from(pedidos)
		.innerJoin(estados, eq(estados.id, pedidos.estado_id))
		.where(eq(pedidos.id, pedidoId))
		.for('update', { of: pedidos });
	if (!pedido) error(404, 'Pedido no encontrado');
	const [{ pagado }] = await tx
		.select({ pagado: sum(pagos.monto_aplicado).mapWith(Number) })
		.from(pagos)
		.where(eq(pagos.pedido_id, pedidoId));
	const total = pedido.precio_total || 0;
	const saldo = redondearPrecio(total - (pedido.anticipo || 0) - (pagado || 0));
	return { ...pedido, total, saldo };
}

async function ajustarTotalTx(
	tx: Tx,
	pedido: { id: number; total: number; moneda: Moneda },
	ajuste: { tipo: TipoAjuste; monto: number; motivo: string },
	usuarioId: number
) {
	const nuevoTotal = totalAjustado(pedido.total, ajuste.tipo, ajuste.monto);
	await tx
		.update(pedidos)
		.set({ precio_total: nuevoTotal, updated_at: new Date() })
		.where(eq(pedidos.id, pedido.id));
	await registrarAuditoria(tx, {
		entidad: 'pedido',
		entidadId: pedido.id,
		usuarioId,
		accion: 'ajuste',
		detalle: `${ajuste.tipo === 'recargo' ? 'Recargo' : 'Descuento'} de ${formatearMoneda(ajuste.monto, pedido.moneda)}: ${ajuste.motivo}. Total ${formatearMoneda(pedido.total, pedido.moneda)} → ${formatearMoneda(nuevoTotal, pedido.moneda)}`
	});
}

function refrescarPedido(pedidoId: number) {
	getPedidoById(pedidoId).refresh();
	getPagosByPedido(pedidoId).refresh();
	getHistorialPedido(pedidoId).refresh();
}

type PagoGuardado = Pick<
	typeof pagos.$inferSelect,
	'monto' | 'moneda' | 'tipo_cambio' | 'metodo_pago' | 'cantidad_cuotas' | 'recibo' | 'fecha_pago'
>;

function describirPago(pago: PagoGuardado) {
	return [
		formatearMoneda(pago.monto, pago.moneda),
		pago.tipo_cambio && pago.moneda === 'ARS' && `TC ${formatearDosDecimales(pago.tipo_cambio)}`,
		pago.metodo_pago === METODO_PAGO.CUOTAS
			? `tarjeta en ${pago.cantidad_cuotas} cuotas`
			: pago.metodo_pago,
		pago.recibo && `Recibo ${pago.recibo}`,
		pago.fecha_pago && formatearFecha(pago.fecha_pago)
	]
		.filter(Boolean)
		.join(' · ');
}

function fechaDelPago(valor: string | undefined, anterior: Date | null | undefined) {
	if (anterior && (!valor || valor === fechaInput(anterior))) return anterior;
	return valor ? fechaDesdeInput(valor) : new Date();
}

async function pagoDelPedido(tx: Tx, pagoId: number, pedidoId: number) {
	const [pago] = await tx
		.select()
		.from(pagos)
		.where(and(eq(pagos.id, pagoId), eq(pagos.pedido_id, pedidoId)))
		.for('update');
	if (!pago) error(404, 'Pago no encontrado');
	return pago;
}

export const registrarPago = form(RegistrarPagoSchema, async (data) => {
	await requirePermission('pedidos', 'edit');
	await requirePermission('importes', 'view');
	const user = await getCurrentUser();
	if (!user) error(401, 'No autorizado');

	if (data.metodo_pago === 'cuotas' && !data.cantidad_cuotas) {
		invalid('Indicá la cantidad de cuotas');
	}

	const monedaPedido = await db
		.select({ moneda: pedidos.moneda })
		.from(pedidos)
		.where(eq(pedidos.id, data.pedido_id))
		.then((r) => r[0]?.moneda);
	if (!monedaPedido) error(404, 'Pedido no encontrado');
	const conCambio = requiereTipoCambio(data.moneda, monedaPedido);
	const tipoCambio = conCambio ? (data.tipo_cambio ?? (await dolarBNA())?.venta ?? null) : null;
	if (conCambio && !tipoCambio) {
		invalid('No se pudo obtener el dólar BNA. Ingresá el tipo de cambio manualmente.');
	}

	await db.transaction(async (tx) => {
		const pedido = await bloquearPedidoConSaldo(tx, data.pedido_id);
		if (pedido.estado === PEDIDO_SLUG.CANCELADO) invalid('El pedido está cancelado');
		const anterior = data.pago_id ? await pagoDelPedido(tx, data.pago_id, data.pedido_id) : null;
		const saldo = redondearPrecio(pedido.saldo + (anterior?.monto_aplicado ?? 0));
		const aplicado = ajustarAlSaldo(
			montoAplicado(
				{ monto: data.monto, moneda: data.moneda, tipo_cambio: tipoCambio },
				pedido.moneda
			),
			saldo
		);
		if (aplicado > saldo) invalid('El pago excede el saldo del pedido');

		const valores = {
			monto: data.monto,
			moneda: data.moneda,
			tipo_cambio: tipoCambio,
			monto_aplicado: aplicado,
			recibo: data.recibo || null,
			metodo_pago: data.metodo_pago ?? null,
			cantidad_cuotas: data.metodo_pago === 'cuotas' ? (data.cantidad_cuotas ?? null) : null,
			observaciones: data.observaciones || null,
			fecha_pago: fechaDelPago(data.fecha_pago, anterior?.fecha_pago)
		};

		if (anterior) {
			await tx.update(pagos).set(valores).where(eq(pagos.id, anterior.id));
			const antes = describirPago(anterior);
			const despues = describirPago(valores);
			if (antes !== despues || anterior.observaciones !== valores.observaciones) {
				await registrarAuditoria(tx, {
					entidad: 'pedido',
					entidadId: pedido.id,
					usuarioId: user.id,
					accion: 'pago',
					detalle:
						antes === despues ? `${despues}. Observaciones editadas` : `${antes} → ${despues}`
				});
			}
		} else {
			await tx.insert(pagos).values({ pedido_id: data.pedido_id, ...valores });
		}

		const diferencia = redondearPrecio(saldo - aplicado);
		if (data.bonificar_diferencia && diferencia > 0) {
			await ajustarTotalTx(
				tx,
				pedido,
				{ tipo: 'descuento', monto: diferencia, motivo: 'diferencia bonificada al cobrar' },
				user.id
			);
		}
	});

	if (!data.pago_id) await avisarPago(data.pedido_id, data.monto, data.moneda, user.id);
	refrescarPedido(data.pedido_id);
	return { success: true };
});

export const eliminarPago = command(
	v.object({ pedido_id: v.number(), pago_id: v.number() }),
	async ({ pedido_id, pago_id }) => {
		const user = await requirePermission('pedidos', 'edit');
		await requirePermission('importes', 'view');

		await db.transaction(async (tx) => {
			const pedido = await bloquearPedidoConSaldo(tx, pedido_id);
			if (pedido.estado === PEDIDO_SLUG.CANCELADO) error(409, 'El pedido está cancelado');
			const pago = await pagoDelPedido(tx, pago_id, pedido_id);
			await tx.delete(pagos).where(eq(pagos.id, pago.id));
			await registrarAuditoria(tx, {
				entidad: 'pedido',
				entidadId: pedido_id,
				usuarioId: user.id,
				accion: 'pago_eliminado',
				detalle: describirPago(pago)
			});
		});

		refrescarPedido(pedido_id);
	}
);

export const ajustarPrecio = form(AjustePrecioSchema, async (data) => {
	const user = await requirePermission('pedidos', 'edit');
	await requirePermission('importes', 'view');

	await db.transaction(async (tx) => {
		const pedido = await bloquearPedidoConSaldo(tx, data.pedido_id);
		if (pedido.estado === PEDIDO_SLUG.CANCELADO) invalid('El pedido está cancelado');
		if (data.tipo === 'descuento' && data.monto > pedido.saldo) {
			invalid(
				`El descuento no puede superar el saldo (${formatearMoneda(pedido.saldo, pedido.moneda)})`
			);
		}
		await ajustarTotalTx(tx, pedido, data, user.id);
	});

	refrescarPedido(data.pedido_id);
	return { success: true };
});

export const cambiarFactura = form(FacturaSchema, async (data) => {
	const user = await requirePermission('pedidos', 'edit');
	const factura = data.factura || null;

	await db.transaction(async (tx) => {
		const [actual] = await tx
			.select({ factura: pedidos.factura })
			.from(pedidos)
			.where(eq(pedidos.id, data.pedido_id))
			.for('update');
		if (!actual) error(404, 'Pedido no encontrado');
		if (actual.factura === factura) return;
		await tx.update(pedidos).set({ factura }).where(eq(pedidos.id, data.pedido_id));
		await registrarAuditoria(tx, {
			entidad: 'pedido',
			entidadId: data.pedido_id,
			usuarioId: user.id,
			accion: 'edicion',
			detalle: factura ? `Factura: ${factura}` : 'Factura quitada'
		});
	});

	getPedidoById(data.pedido_id).refresh();
	getHistorialPedido(data.pedido_id).refresh();
	return { success: true };
});
