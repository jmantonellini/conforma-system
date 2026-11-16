import { avisarPago } from './avisos.server';
import { error, invalid } from '@sveltejs/kit';
import { form, query } from '$app/server';
import { db } from '$lib/server/db';
import { pagos, pedidos } from '$lib/server/db/schema';
import { desc, eq, sum } from 'drizzle-orm';
import * as v from 'valibot';
import { getCurrentUser } from '../configuracion/usuarios.remote';
import { getHistorialPedido, getPedidoById } from './pedidos.remote';
import { requirePermission } from '$lib/server/auth/permissions';
import { registrarAuditoria } from '$lib/server/auditoria';
import { ESTADO_PAGO, METODO_PAGO, type EstadoPago } from '$lib/modulos/pedidos/tipos';
import { ajustarAlSaldo, montoAplicado, requiereTipoCambio } from './pagos';
import { dolarBNA } from '../ventas/moneda.server';
import { MONEDAS } from '$lib/utils/moneda';
import { redondearPrecio } from '$lib/utils/precios';

const textoOpcional = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100)));

const RegistrarPagoSchema = v.object({
	pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
	monto: v.pipe(v.number(), v.gtValue(0, 'El monto debe ser mayor a cero')),
	moneda: v.optional(v.picklist(MONEDAS), 'ARS'),
	tipo_cambio: v.optional(v.pipe(v.number(), v.gtValue(0, 'El tipo de cambio debe ser positivo'))),
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
	observaciones: v.optional(v.string())
});

const FacturaSchema = v.object({
	pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
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
				tipo_cambio: pedidos.tipo_cambio
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
		moneda: pedidoRow?.moneda ?? 'USD',
		tipo_cambio_pedido: pedidoRow?.tipo_cambio ?? null
	};
});

export const registrarPago = form(RegistrarPagoSchema, async (data) => {
	await requirePermission('pedidos', 'edit');
	await requirePermission('importes', 'view');
	const user = await getCurrentUser();
	if (!user) error(401, 'No autorizado');

	const pedido = await db
		.select()
		.from(pedidos)
		.where(eq(pedidos.id, data.pedido_id))
		.then((r) => r[0]);

	if (!pedido) error(404, 'Pedido no encontrado');
	if (data.metodo_pago === 'cuotas' && !data.cantidad_cuotas) {
		invalid('Indicá la cantidad de cuotas');
	}

	const conCambio = requiereTipoCambio(data.moneda, pedido.moneda);
	const tipoCambio = conCambio ? (data.tipo_cambio ?? (await dolarBNA())?.venta ?? null) : null;
	if (conCambio && !tipoCambio) {
		invalid('No se pudo obtener el dólar BNA. Ingresá el tipo de cambio manualmente.');
	}

	const [{ pagado }] = await db
		.select({ pagado: sum(pagos.monto_aplicado).mapWith(Number) })
		.from(pagos)
		.where(eq(pagos.pedido_id, data.pedido_id));
	const saldo = redondearPrecio(
		(pedido.precio_total || 0) - (pedido.anticipo || 0) - (pagado || 0)
	);
	const aplicado = ajustarAlSaldo(
		montoAplicado(
			{ monto: data.monto, moneda: data.moneda, tipo_cambio: tipoCambio },
			pedido.moneda
		),
		saldo
	);

	if (aplicado > saldo) {
		invalid('El pago excede el saldo del pedido');
	}

	await db.insert(pagos).values({
		pedido_id: data.pedido_id,
		monto: data.monto,
		moneda: data.moneda,
		tipo_cambio: tipoCambio,
		monto_aplicado: aplicado,
		recibo: data.recibo || null,
		metodo_pago: data.metodo_pago,
		cantidad_cuotas: data.metodo_pago === 'cuotas' ? data.cantidad_cuotas : null,
		observaciones: data.observaciones
	});

	await avisarPago(data.pedido_id, data.monto, data.moneda, user.id);
	getPedidoById(data.pedido_id).refresh();
	getPagosByPedido(data.pedido_id).refresh();
	getHistorialPedido(data.pedido_id).refresh();

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
