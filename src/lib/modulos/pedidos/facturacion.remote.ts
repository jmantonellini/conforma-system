import { avisarPago } from './avisos.server';
import { error } from '@sveltejs/kit';
import { form, query } from '$app/server';
import { db } from '$lib/server/db';
import { pagos, pedidos } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { getCurrentUser } from '../configuracion/usuarios.remote';
import { getHistorialPedido, getPedidoById } from './pedidos.remote';
import { requirePermission } from '$lib/server/auth/permissions';
import { ESTADO_PAGO, METODO_PAGO, type EstadoPago } from '$lib/modulos/pedidos/tipos';

const RegistrarPagoSchema = v.object({
	pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
	monto: v.number(),
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

export const getPagosByPedido = query(v.number(), async (pedidoId) => {
	await requirePermission('pedidos', 'view');
	await requirePermission('importes', 'view');

	const [pagosRows, pedidoRow] = await Promise.all([
		db.select().from(pagos).where(eq(pagos.pedido_id, pedidoId)).orderBy(desc(pagos.created_at)),
		db
			.select({
				precio_total: pedidos.precio_total,
				anticipo: pedidos.anticipo,
				moneda: pedidos.moneda
			})
			.from(pedidos)
			.where(eq(pedidos.id, pedidoId))
			.then((r) => r[0])
	]);

	const totalPagado =
		(pedidoRow?.anticipo || 0) + pagosRows.reduce((s, p) => s + (p.monto || 0), 0);
	const saldo = (pedidoRow?.precio_total || 0) - totalPagado;

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

	return { pagos: pagosRows, totalPagado, saldo, estado, moneda: pedidoRow?.moneda ?? 'USD' };
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
		error(400, 'Indicá la cantidad de cuotas');
	}

	const pagosActuales = await db
		.select({ monto: pagos.monto })
		.from(pagos)
		.where(eq(pagos.pedido_id, data.pedido_id));

	const totalPagado =
		(pedido.anticipo || 0) + pagosActuales.reduce((s, p) => s + (p.monto || 0), 0);

	if (totalPagado + data.monto > (pedido.precio_total || 0)) {
		error(400, 'El pago excede el total del pedido');
	}

	await db.insert(pagos).values({
		pedido_id: data.pedido_id,
		monto: data.monto,
		metodo_pago: data.metodo_pago,
		cantidad_cuotas: data.metodo_pago === 'cuotas' ? data.cantidad_cuotas : null,
		observaciones: data.observaciones
	});

	await avisarPago(data.pedido_id, data.monto, user.id);
	getPedidoById(data.pedido_id).refresh();
	getPagosByPedido(data.pedido_id).refresh();
	getHistorialPedido(data.pedido_id).refresh();

	return { success: true };
});
