import { form, query } from '$app/server';
import { db } from '$lib/server/db';
import { pagos, pedidos } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { getCurrentUser } from './usuarios.remote';
import { getPedidoById } from './pedidos.remote';

const RegistrarPagoSchema = v.object({
	pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
	monto: v.number(),
	metodo_pago: v.optional(v.string()),
	observaciones: v.optional(v.string())
});

// QUERIES

export const getPagosByPedido = query(v.number(), async (pedidoId) => {
	const [pagosRows, pedidoRow] = await Promise.all([
		db.select().from(pagos).where(eq(pagos.pedido_id, pedidoId)).orderBy(desc(pagos.created_at)),
		db
			.select({ precio_total: pedidos.precio_total, anticipo: pedidos.anticipo })
			.from(pedidos)
			.where(eq(pedidos.id, pedidoId))
			.then((r) => r[0])
	]);

	const totalPagado =
		(pedidoRow?.anticipo || 0) + pagosRows.reduce((s, p) => s + (p.monto || 0), 0);
	const saldo = (pedidoRow?.precio_total || 0) - totalPagado;

	let estado: 'sin_pagar' | 'anticipo' | 'parcial' | 'pagado';
	if (saldo <= 0 && pedidoRow?.precio_total) {
		estado = 'pagado';
	} else if (totalPagado === 0) {
		estado = 'sin_pagar';
	} else if (totalPagado === (pedidoRow?.anticipo || 0) && pagosRows.length === 0) {
		estado = 'anticipo';
	} else {
		estado = 'parcial';
	}

	return { pagos: pagosRows, totalPagado, saldo, estado };
});

// FORMS

export const registrarPago = form(RegistrarPagoSchema, async (data) => {
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const pedido = await db
		.select()
		.from(pedidos)
		.where(eq(pedidos.id, data.pedido_id))
		.then((r) => r[0]);

	if (!pedido) throw new Error('Pedido no encontrado');

	const pagosActuales = await db
		.select({ monto: pagos.monto })
		.from(pagos)
		.where(eq(pagos.pedido_id, data.pedido_id));

	const totalPagado =
		(pedido.anticipo || 0) + pagosActuales.reduce((s, p) => s + (p.monto || 0), 0);

	if (totalPagado + data.monto > (pedido.precio_total || 0)) {
		throw new Error('El pago excede el total del pedido');
	}

	await db.insert(pagos).values({
		pedido_id: data.pedido_id,
		monto: data.monto,
		metodo_pago: data.metodo_pago,
		observaciones: data.observaciones
	});

	// Refrescar queries relacionadas
	getPedidoById(data.pedido_id).refresh();
	getPagosByPedido(data.pedido_id).refresh();

	return { success: true };
});
