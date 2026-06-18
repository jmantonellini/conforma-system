import * as v from 'valibot';
import { query, form, command, getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import {
	ordenes_fabricacion,
	unidades_fabricacion,
	lineas_pedido,
	pedidos,
	productos,
	estados_fabricacion,
	empleados,
	clientes
} from '$lib/server/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';
import { CrearOrdenSchema } from './fabricacion.schema';

// ============================================
// QUERIES
// ============================================

export const getEstadosFabricacion = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(estados_fabricacion).orderBy(estados_fabricacion.orden);
});

export const getEmpleados = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db
		.select({
			id: empleados.id,
			nombre: empleados.nombre,
			apellido: empleados.apellido
		})
		.from(empleados)
		.where(eq(empleados.activo, true));
});

export const getOrdenesFabricacion = query(
	v.object({
		estado: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ estado, page, limit }) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const offset = (page - 1) * limit;

		let where = undefined;
		if (estado) {
			where = eq(ordenes_fabricacion.estado_id, estado);
		}

		const data = await db
			.select({
				id: ordenes_fabricacion.id,
				numero_orden: ordenes_fabricacion.id,
				nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
				cantidad_total: ordenes_fabricacion.cantidad_total,
				cantidad_producida: ordenes_fabricacion.cantidad_producida,
				cantidad_defectuosa: ordenes_fabricacion.cantidad_defectuosa,
				prioridad: ordenes_fabricacion.prioridad,
				estado: {
					id: estados_fabricacion.id,
					nombre: estados_fabricacion.nombre,
					color: estados_fabricacion.color
				},
				fecha_inicio: ordenes_fabricacion.fecha_inicio,
				fecha_fin_estimada: ordenes_fabricacion.fecha_fin_estimada,
				asignado_a: ordenes_fabricacion.asignado_a,
				empleado: {
					id: empleados.id,
					nombre: empleados.nombre,
					apellido: empleados.apellido
				},
				pedido: {
					id: pedidos.id,
					numero: pedidos.numero_pedido
				},
				producto_nombre: productos.nombre
			})
			.from(ordenes_fabricacion)
			.leftJoin(estados_fabricacion, eq(ordenes_fabricacion.estado_id, estados_fabricacion.id))
			.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
			.leftJoin(lineas_pedido, eq(lineas_pedido.orden_fabricacion_id, ordenes_fabricacion.id))
			.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
			.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
			.where(where)
			.orderBy(desc(ordenes_fabricacion.prioridad), desc(ordenes_fabricacion.id))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({ count: count() })
			.from(ordenes_fabricacion)
			.where(where);

		return {
			data,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getOrdenFabricacion = query(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	const orden = await db
		.select({
			id: ordenes_fabricacion.id,
			nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
			cantidad_total: ordenes_fabricacion.cantidad_total,
			cantidad_producida: ordenes_fabricacion.cantidad_producida,
			cantidad_defectuosa: ordenes_fabricacion.cantidad_defectuosa,
			prioridad: ordenes_fabricacion.prioridad,
			fecha_inicio: ordenes_fabricacion.fecha_inicio,
			fecha_fin_estimada: ordenes_fabricacion.fecha_fin_estimada,
			fecha_fin_real: ordenes_fabricacion.fecha_fin_real,
			empleado: {
				id: ordenes_fabricacion.asignado_a,
				nombre: empleados.nombre,
				apellido: empleados.apellido
			},
			cliente: {
				id: pedidos.cliente_id,
				nombre: clientes.nombre
			},
			observaciones: ordenes_fabricacion.observaciones,
			estado: {
				id: estados_fabricacion.id,
				nombre: estados_fabricacion.nombre,
				color: estados_fabricacion.color
			},
			pedido_numero: pedidos.numero_pedido,
			producto_nombre: productos.nombre
		})
		.from(ordenes_fabricacion)
		.leftJoin(estados_fabricacion, eq(ordenes_fabricacion.estado_id, estados_fabricacion.id))
		.leftJoin(lineas_pedido, eq(lineas_pedido.orden_fabricacion_id, ordenes_fabricacion.id))
		.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
		.where(eq(ordenes_fabricacion.id, id))
		.get();

	if (!orden) throw new Error('Orden no encontrada');

	const unidades = await db
		.select({
			id: unidades_fabricacion.id,
			numero_serie: unidades_fabricacion.numero_serie,
			estado: {
				id: estados_fabricacion.id,
				nombre: estados_fabricacion.nombre,
				color: estados_fabricacion.color
			},
			es_defectuoso: unidades_fabricacion.es_defectuoso,
			defecto_descripcion: unidades_fabricacion.defecto_descripcion,
			fecha_entrada_estado: unidades_fabricacion.fecha_entrada_estado,
			observaciones: unidades_fabricacion.observaciones
		})
		.from(unidades_fabricacion)
		.leftJoin(estados_fabricacion, eq(unidades_fabricacion.estado_id, estados_fabricacion.id))
		.where(eq(unidades_fabricacion.orden_fabricacion_id, id))
		.orderBy(unidades_fabricacion.id);

	return { ...orden, unidades };
});

// ============================================
// FORMS
// ============================================

export const crearOrdenFabricacion = form(CrearOrdenSchema, async (data) => {
	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);
	const user = await getCurrentUser();

	if (!user) throw new Error('No autorizado');

	// Obtener estado inicial (Pendiente)
	const [estadoInicial] = await db
		.select()
		.from(estados_fabricacion)
		.where(eq(estados_fabricacion.slug, 'pendiente'))
		.limit(1);

	if (!estadoInicial) throw new Error('Estado "Pendiente" no encontrado');

	const [orden] = await db
		.insert(ordenes_fabricacion)
		.values({
			nombre_trabajo: data.nombre_trabajo,
			cantidad_total: data.cantidad_total,
			estado_id: estadoInicial.id,
			prioridad: data.prioridad,
			fecha_fin_estimada: data.fecha_fin_estimada ? new Date(data.fecha_fin_estimada) : null,
			asignado_a: data.asignado_a || null,
			observaciones: data.observaciones
		})
		.returning();

	await db
		.update(lineas_pedido)
		.set({ orden_fabricacion_id: orden.id })
		.where(eq(lineas_pedido.id, data.linea_pedido_id));

	// Crear unidades individuales
	const unidades = [];
	for (let i = 1; i <= data.cantidad_total; i++) {
		const [unidad] = await db
			.insert(unidades_fabricacion)
			.values({
				orden_fabricacion_id: orden.id,
				numero_serie: `${orden.id}-${i.toString().padStart(3, '0')}`,
				estado_id: estadoInicial.id,
				fecha_entrada_estado: new Date()
			})
			.returning();
		unidades.push(unidad);
	}

	return { success: true, orden, unidades };
});

// ============================================
// COMMANDS
// ============================================

export const actualizarEstadoOrden = command(
	v.object({
		orden_id: v.number(),
		estado_id: v.number()
	}),
	async (data) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const user = await getCurrentUser();

		if (!user) throw new Error('No autorizado');

		const [orden] = await db
			.update(ordenes_fabricacion)
			.set({
				estado_id: data.estado_id,
				updated_at: new Date()
			})
			.where(eq(ordenes_fabricacion.id, data.orden_id))
			.returning();

		getOrdenFabricacion(orden.id).refresh();
		return { success: true, orden };
	}
);

export const actualizarEstadoUnidad = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		estado_id: v.pipe(v.string(), v.transform(Number), v.number())
	}),
	async (data) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		const [unidad] = await db
			.update(unidades_fabricacion)
			.set({
				estado_id: data.estado_id,
				fecha_entrada_estado: new Date(),
				updated_at: new Date()
			})
			.where(eq(unidades_fabricacion.id, data.unidad_id))
			.returning();
		getOrdenFabricacion(unidad.orden_fabricacion_id).refresh();
		return { success: true, unidad };
	}
);

export const marcarUnidadDefectuosa = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		descripcion: v.string()
	}),
	async (data) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		const [unidad] = await db
			.update(unidades_fabricacion)
			.set({
				es_defectuoso: true,
				defecto_descripcion: data.descripcion,
				updated_at: new Date()
			})
			.where(eq(unidades_fabricacion.id, data.unidad_id))
			.returning();

		return { success: true, unidad };
	}
);

export const eliminarOrdenFabricacion = command(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	await db.delete(ordenes_fabricacion).where(eq(ordenes_fabricacion.id, id));
	getOrdenesFabricacion({}).refresh();
	return { success: true };
});
