import * as v from 'valibot';
import { command, form, getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import {
	pedidos,
	lineas_pedido,
	logs_pedidos,
	clientes,
	estados_pedido,
	productos
} from '$lib/server/db/schema';
import { getCurrentUser } from './usuarios.remote';
import { redirect } from '@sveltejs/kit';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { resolve } from '$app/paths';
import { and, count, desc, eq, like } from 'drizzle-orm';
import { goto } from '$app/navigation';

const LineaSchema = v.object({
	producto_id: v.string(),
	cantidad: v.pipe(v.number(), v.toMinValue(1)),
	precio: v.pipe(v.number(), v.toMinValue(0)),
	descripcion: v.optional(v.string())
});

const PedidoSchema = v.object({
	cliente_id: v.pipe(v.string(), v.toNumber()),
	lineas: v.pipe(v.array(LineaSchema), v.minLength(1)),
	fecha_entrega_prometida: v.optional(v.string()),
	anticipo: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	observaciones: v.optional(v.string())
});

export const getPedidos = query(
	v.object({
		search: v.optional(v.string()),
		estadoId: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({
		search,
		estadoId,
		page = 1,
		limit = 10
	}: {
		search?: string;
		estadoId?: number;
		page?: number;
		limit?: number;
	}) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const offset = (page - 1) * limit;

		let where = undefined;
		if (search && estadoId) {
			where = and(like(pedidos.numero_pedido, `%${search}%`), eq(pedidos.estado_id, estadoId));
		} else if (search) {
			where = like(pedidos.numero_pedido, `%${search}%`);
		} else if (estadoId) {
			where = eq(pedidos.estado_id, estadoId);
		}

		// Obtener pedidos con datos del cliente
		const data = await db
			.select({
				id: pedidos.id,
				numero_pedido: pedidos.numero_pedido,
				cliente_nombre: clientes.nombre,
				fecha: pedidos.fecha_pedido,
				total: pedidos.precio_total,
				estado_id: pedidos.estado_id,
				estado_nombre: estados_pedido.nombre,
				estado_color: estados_pedido.color
			})
			.from(pedidos)
			.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
			.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
			.where(where)
			.orderBy(desc(pedidos.id))
			.limit(limit)
			.offset(offset);

		// Contar total
		const [totalResult] = await db.select({ count: count() }).from(pedidos).where(where);

		console.log('DATA', data);

		return {
			data,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getPedidoById = query(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	const pedido = await db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_nombre: clientes.nombre,
			fecha: pedidos.fecha_pedido,
			observaciones: pedidos.observaciones,
			anticipo: pedidos.anticipo,
			total: pedidos.precio_total,
			estado: {
				id: pedidos.estado_id,
				nombre: estados_pedido.nombre,
				color: estados_pedido.color
			}
		})
		.from(pedidos)
		.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.where(eq(pedidos.id, id))
		.get();

	const lineas = await db
		.select({
			id: lineas_pedido.id,
			cantidad: lineas_pedido.cantidad,
			precio_unitario: lineas_pedido.precio_unitario,
			subtotal: lineas_pedido.subtotal,
			es_personalizado: lineas_pedido.es_personalizado,
			descripcion_personalizada: lineas_pedido.descripcion_personalizada,
			producto_id: lineas_pedido.producto_id,
			producto_codigo: productos.codigo,
			producto_nombre: productos.nombre
		})
		.from(lineas_pedido)
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.where(eq(lineas_pedido.pedido_id, id));

	if (!pedido) throw new Error('Pedido no encontrado');
	return { pedido, lineas };
});

export const crearPedido = form(PedidoSchema, async (data) => {
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);

	const numero_pedido = await generarNumeroPedido(db);

	const precio_total = data.lineas.reduce((sum, l) => sum + l.cantidad * l.precio, 0);
	const saldo_pendiente = precio_total - data.anticipo;

	const [pedido] = await db
		.insert(pedidos)
		.values({
			cliente_id: data.cliente_id,
			numero_pedido,
			fecha_pedido: new Date(),
			fecha_entrega_prometida: data.fecha_entrega_prometida
				? new Date(data.fecha_entrega_prometida)
				: null,
			estado_id: 1, // Asumiendo que 1 es el estado "Pendiente"
			precio_total,
			anticipo: data.anticipo,
			saldo_pendiente,
			observaciones: data.observaciones
		})
		.returning();

	for (const linea of data.lineas) {
		await db.insert(lineas_pedido).values({
			pedido_id: pedido.id,
			producto_id: linea.producto_id === 'personalizado' ? null : parseInt(linea.producto_id),
			cantidad: linea.cantidad,
			precio_unitario: linea.precio,
			es_personalizado: linea.producto_id === 'personalizado',
			descripcion_personalizada: linea.descripcion
		});
	}

	await db.insert(logs_pedidos).values({
		pedido_id: pedido.id,
		usuario_id: user.id,
		accion: 'crear',
		ip_address: event.getClientAddress(),
		user_agent: event.request.headers.get('user-agent') || undefined
	});

	redirect(303, resolve(`/pedidos/${pedido.id}`));
});

export const getEstadosPedido = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(estados_pedido).orderBy(estados_pedido.nombre);
});

export const eliminarPedido = command(v.number(), async (pedidoId) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	console.log('ELIMINAR', pedidoId);

	await db.delete(pedidos).where(eq(pedidos.id, pedidoId));
	redirect(303, '/pedidos');
});
