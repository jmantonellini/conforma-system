import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	pedidos,
	lineas_pedido,
	clientes,
	estados_pedido,
	productos,
	ordenes_fabricacion,
	unidades_fabricacion,
	estados_fabricacion,
	logs_cambios_estado,
	transiciones_estado
} from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { resolve } from '$app/paths';
import { and, count, desc, eq, isNull, like } from 'drizzle-orm';
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

// ============================================================
// QUERIES
// ============================================================

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
		const offset = (page - 1) * limit;

		let where = undefined;
		if (search && estadoId) {
			where = and(like(pedidos.numero_pedido, `%${search}%`), eq(pedidos.estado_id, estadoId));
		} else if (search) {
			where = like(pedidos.numero_pedido, `%${search}%`);
		} else if (estadoId) {
			where = eq(pedidos.estado_id, estadoId);
		}

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
	const [pedido] = await db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente: {
				id: clientes.id,
				nombre: clientes.nombre,
				apellido: clientes.apellido,
				razon_social: clientes.razon_social
			},
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
		.limit(1);

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
			orden_id: ordenes_fabricacion.id
		})
		.from(lineas_pedido)
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(ordenes_fabricacion, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(eq(lineas_pedido.pedido_id, id));

	// Para cada línea con orden, calcular estado de producción
	const lineasConProduccion = await Promise.all(
		lineas.map(async (linea) => {
			if (!linea.orden_id) return { ...linea, produccion: null };

			const [unidades, estadosFab] = await Promise.all([
				db
					.select({ estado_id: unidades_fabricacion.estado_id })
					.from(unidades_fabricacion)
					.where(eq(unidades_fabricacion.orden_fabricacion_id, linea.orden_id)),
				db.select().from(estados_fabricacion)
			]);

			const terminadas = unidades.filter(
				(u) => estadosFab.find((e) => e.id === u.estado_id)?.es_final
			).length;
			const total = unidades.length;

			return {
				...linea,
				produccion: {
					orden_id: linea.orden_id,
					estado: total === 0 ? 'Sin unidades' : terminadas === total ? 'Terminado' : 'En progreso',
					porcentaje: total > 0 ? Math.round((terminadas / total) * 100) : 0,
					terminadas,
					total
				}
			};
		})
	);

	return { pedido, lineas: lineasConProduccion };
});

// ============================================================
// RESUMEN DE PRODUCCIÓN (para que el vendedor decida)
// ============================================================

export const getResumenProduccionPedido = query(v.number(), async (pedido_id) => {
	const ordenes = await db
		.select({
			orden_id: ordenes_fabricacion.id,
			cantidad_total: ordenes_fabricacion.cantidad_total
		})
		.from(ordenes_fabricacion)
		.innerJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(eq(lineas_pedido.pedido_id, pedido_id));

	const ordenesConEstado = await Promise.all(
		ordenes.map(async (o) => {
			const unidades = await db
				.select({ estado_id: unidades_fabricacion.estado_id })
				.from(unidades_fabricacion)
				.where(eq(unidades_fabricacion.orden_fabricacion_id, o.orden_id));

			const estadosFab = await db.select().from(estados_fabricacion);
			const terminadas = unidades.filter(
				(u) => estadosFab.find((e) => e.id === u.estado_id)?.es_final
			).length;

			return {
				...o,
				terminadas,
				completada: terminadas === o.cantidad_total && o.cantidad_total > 0
			};
		})
	);

	const todasTerminadas = ordenesConEstado.every((o) => o.completada);
	const porcentajeTotal =
		ordenesConEstado.length > 0
			? Math.round(
					ordenesConEstado.reduce((sum, o) => sum + (o.terminadas / o.cantidad_total) * 100, 0) /
						ordenesConEstado.length
				)
			: 0;

	return {
		ordenes: ordenesConEstado,
		todasTerminadas,
		porcentaje_avance_total: porcentajeTotal,
		cantidad_ordenes: ordenesConEstado.length,
		ordenes_terminadas: ordenesConEstado.filter((o) => o.completada).length
	};
});

// ============================================================
// CAMBIO DE ESTADO DE PEDIDO (vendedor)
// ============================================================

export const cambiarEstadoPedido = command(
	v.object({
		pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
		estado_destino_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async ({ pedido_id, estado_destino_id, comentario }) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const now = new Date();

		// Obtener estado actual
		const pedido = await db
			.select({ estado_id: pedidos.estado_id })
			.from(pedidos)
			.where(eq(pedidos.id, pedido_id))
			.then((rows) => rows[0]);

		if (!pedido) throw new Error('Pedido no encontrado');

		// Validar transición
		const transicion = await db
			.select()
			.from(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'pedido'),
					eq(transiciones_estado.estado_origen_id, pedido.estado_id),
					eq(transiciones_estado.estado_destino_id, estado_destino_id)
				)
			)
			.then((rows) => rows[0]);

		if (!transicion) {
			const [actual, destino] = await Promise.all([
				db
					.select()
					.from(estados_pedido)
					.where(eq(estados_pedido.id, pedido.estado_id))
					.then((r) => r[0]),
				db
					.select()
					.from(estados_pedido)
					.where(eq(estados_pedido.id, estado_destino_id))
					.then((r) => r[0])
			]);
			throw new Error(
				`Transición no permitida: ${actual?.nombre ?? '?'} → ${destino?.nombre ?? '?'}`
			);
		}

		// Ejecutar en transacción
		await db.transaction(async (tx) => {
			await tx
				.update(pedidos)
				.set({ estado_id: estado_destino_id, updated_at: now })
				.where(eq(pedidos.id, pedido_id));

			await tx.insert(logs_cambios_estado).values({
				entidad_tipo: 'pedido',
				entidad_id: pedido_id,
				usuario_id: user.id,
				estado_anterior_id: pedido.estado_id,
				estado_nuevo_id: estado_destino_id,
				comentario: comentario ?? null,
				created_at: now
			});
		});

		getPedidos({ search: '', page: 1 }).refresh();

		return { success: true };
	}
);

export const crearPedido = form(PedidoSchema, async (data) => {
	const user = await getCurrentUser();
	if (!user) {
		throw new Error('Usuario no autenticado');
	}

	const numero_pedido = await generarNumeroPedido();

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

	redirect(303, resolve(`/pedidos/${pedido.id}`));
});

export const eliminarPedido = command(v.number(), async (pedidoId) => {
	await db.delete(pedidos).where(eq(pedidos.id, pedidoId));
	await db.delete(lineas_pedido).where(eq(lineas_pedido.pedido_id, pedidoId));

	getPedidos({ search: '', page: 1 }).refresh();
	return { success: true };
});

// Función simplificada para líneas sin orden (para el formulario de nueva orden)
export const getLineasPedidoSinOrden = query(
	v.object({
		pedido_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async ({ pedido_id, limit }) => {
		// const conditions = [isNull(lineas_pedido.orden_fabricacion_id)];  // TODO: manejar bien la relación
		const conditions = [isNull(ordenes_fabricacion.linea_pedido_id)];
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

// ESTADOS DE PEDIDO

export const getEstadosPedido = query(async () => {
	return await db.select().from(estados_pedido).orderBy(estados_pedido.nombre);
});

export const crearEstadoPedido = form(
	v.object({
		nombre: v.string(),
		color: v.string(),
		grupo: v.string(), // TODO: manejar grupo
		esFinal: v.optional(v.boolean(), false),
		orden: v.optional(v.number(), 0)
	}),
	async (data) => {
		const slug = data.nombre.toLowerCase().replace(/\s+/g, '-');

		await db.insert(estados_pedido).values({ slug, ...data });
		getEstadosPedido().refresh();
		return { success: true };
	}
);

export const eliminarEstadoPedido = command(v.number(), async (id) => {
	await db.delete(estados_pedido).where(eq(estados_pedido.id, id));
	getEstadosPedido().refresh();
	return { success: true };
});
