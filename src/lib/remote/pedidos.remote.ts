import * as v from 'valibot';
import { command, form, getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import {
	pedidos,
	lineas_pedido,
	logs_pedidos,
	clientes,
	estados_pedido,
	productos,
	ordenes_fabricacion,
	estados_fabricacion
} from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { resolve } from '$app/paths';
import { and, count, desc, eq, inArray, isNull, like, not, sql } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';

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

	if (!pedido) throw new Error('Pedido no encontrado');

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
			producto_nombre: productos.nombre,
			tiene_orden: sql<boolean>`${lineas_pedido.orden_fabricacion_id} IS NOT NULL`,
			orden: {
				id: ordenes_fabricacion.id,
				estado_id: estados_fabricacion.id,
				estado_nombre: estados_fabricacion.nombre,
				estado_color: estados_fabricacion.color
			}
		})
		.from(lineas_pedido)
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(ordenes_fabricacion, eq(lineas_pedido.orden_fabricacion_id, ordenes_fabricacion.id))
		.leftJoin(estados_fabricacion, eq(ordenes_fabricacion.estado_id, estados_fabricacion.id))
		.where(eq(lineas_pedido.pedido_id, id));

	if (!pedido) throw new Error('Pedido no encontrado');
	return { pedido, lineas };
});

export const crearPedido = form(PedidoSchema, async (data) => {
	const event = getRequestEvent();

	const user = await getCurrentUser();
	if (!user) {
		throw new Error('Usuario no autenticado');
	}

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
	redirect(303, resolve('/pedidos'));
});

export const getLineasPedido = query(
	v.object({
		pedido_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
		solo_sin_orden: v.optional(v.boolean(), false),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50),
		offset: v.optional(v.pipe(v.number(), v.minValue(0)), 0)
	}),
	async ({ pedido_id, solo_sin_orden, limit, offset }) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		// Subquery para líneas que tienen orden
		const lineasConOrden = db
			.select({ linea_pedido_id: ordenes_fabricacion.linea_pedido_id })
			.from(ordenes_fabricacion);

		const conditions = [];

		if (pedido_id) {
			conditions.push(eq(lineas_pedido.pedido_id, pedido_id));
		}

		if (solo_sin_orden) {
			conditions.push(not(inArray(lineas_pedido.id, lineasConOrden)));
		}

		const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

		const data = await db
			.select({
				id: lineas_pedido.id,
				pedido_id: lineas_pedido.pedido_id,
				pedido_numero: pedidos.numero_pedido,
				producto_id: lineas_pedido.producto_id,
				producto_nombre: productos.nombre,
				cantidad: lineas_pedido.cantidad,
				precio_unitario: lineas_pedido.precio_unitario,
				subtotal: lineas_pedido.subtotal,
				es_personalizado: lineas_pedido.es_personalizado,
				descripcion_personalizada: lineas_pedido.descripcion_personalizada,
				// Si tiene orden, traer datos de la orden
				orden_id: ordenes_fabricacion.id,
				orden_estado_id: ordenes_fabricacion.estado_id,
				orden_estado_nombre: estados_fabricacion.nombre,
				orden_estado_color: estados_fabricacion.color,
				tiene_orden: sql<boolean>`EXISTS (SELECT 1 FROM ordenes_fabricacion WHERE ordenes_fabricacion.linea_pedido_id = lineas_pedido.id)`
			})
			.from(lineas_pedido)
			.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
			.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
			.leftJoin(ordenes_fabricacion, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
			.leftJoin(estados_fabricacion, eq(ordenes_fabricacion.estado_id, estados_fabricacion.id))
			.where(whereCondition)
			.orderBy(desc(lineas_pedido.id))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({ count: count() })
			.from(lineas_pedido)
			.where(whereCondition);

		return {
			data,
			total: totalResult?.count || 0
		};
	}
);

// Función simplificada para líneas sin orden (para el formulario de nueva orden)
export const getLineasPedidoSinOrden = query(
	v.object({
		pedido_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async ({ pedido_id, limit }) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		const conditions = [isNull(lineas_pedido.orden_fabricacion_id)];
		if (pedido_id) {
			conditions.push(eq(lineas_pedido.pedido_id, pedido_id));
		}

		return await db
			.select({
				id: lineas_pedido.id,
				pedido_numero: pedidos.numero_pedido,
				producto_nombre: productos.nombre,
				cantidad: lineas_pedido.cantidad,
				descripcion: lineas_pedido.descripcion_personalizada,
				es_personalizado: lineas_pedido.es_personalizado
			})
			.from(lineas_pedido)
			.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
			.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
			.where(and(...conditions))
			.limit(limit);
	}
);
