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
	clientes,
	acciones_fabricacion
} from '$lib/server/db/schema';
import { eq, desc, count, sql, and } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';
import { CrearOrdenSchema } from './fabricacion.schema';

// ============================================
// QUERIES
// ============================================

export const getEstadosFabricacion = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(estados_fabricacion).orderBy(estados_fabricacion.orden);
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

		const ordenes = await db
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
				producto_nombre: productos.nombre,
				estado_comentario: ordenes_fabricacion.estado_comentario,
				unidades: sql<string>`
          json_group_array(
            json_object(
              'estado_nombre', ${estados_fabricacion.nombre}
            )
          )
        `
			})
			.from(ordenes_fabricacion)
			.leftJoin(estados_fabricacion, eq(ordenes_fabricacion.estado_id, estados_fabricacion.id))
			.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
			.leftJoin(lineas_pedido, eq(lineas_pedido.orden_fabricacion_id, ordenes_fabricacion.id))
			.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
			.leftJoin(
				unidades_fabricacion,
				eq(unidades_fabricacion.orden_fabricacion_id, ordenes_fabricacion.id)
			)
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
			ordenes,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getOrdenFabricacion = query(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	const unidades = await db
		.select({
			id: unidades_fabricacion.id,
			numero_serie: unidades_fabricacion.numero_serie,
			estado: {
				id: estados_fabricacion.id,
				nombre: estados_fabricacion.nombre,
				color: estados_fabricacion.color,
				comentario: unidades_fabricacion.estado_comentario,
				es_final: estados_fabricacion.es_final
			},
			es_defectuoso: unidades_fabricacion.es_defectuoso,
			defecto_descripcion: unidades_fabricacion.defecto_descripcion,
			fecha_entrada_estado: unidades_fabricacion.fecha_entrada_estado,
			observaciones: unidades_fabricacion.observaciones,
			acciones: sql<string>`
        json_group_array(
					CASE 
						WHEN ${acciones_fabricacion.id} IS NOT NULL 
						THEN json_object(
							'id', ${acciones_fabricacion.id},
							'nombre', ${acciones_fabricacion.nombre},
							'estado_destino_id', ${acciones_fabricacion.estado_destino_id}
						)
						ELSE NULL
					END
				)
			`
		})
		.from(unidades_fabricacion)
		.leftJoin(estados_fabricacion, eq(unidades_fabricacion.estado_id, estados_fabricacion.id))
		.leftJoin(
			acciones_fabricacion,
			sql`
      (
        ${acciones_fabricacion.estado_origen_id} = ${unidades_fabricacion.estado_id}
        OR ${acciones_fabricacion.estado_origen_id} IS NULL
      )
      AND ${estados_fabricacion.es_final} = 0
    `
		)
		.where(
			and(
				eq(unidades_fabricacion.orden_fabricacion_id, id),
				sql`${acciones_fabricacion.estado_destino_id} IS NULL OR ${acciones_fabricacion.estado_destino_id} != ${unidades_fabricacion.estado_id}`
			)
		)
		.groupBy(unidades_fabricacion.id)
		.orderBy(unidades_fabricacion.id);

	console.log(unidades);

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
				color: estados_fabricacion.color,
				es_final: estados_fabricacion.es_final
			},
			pedido_numero: pedidos.numero_pedido,
			producto_nombre: productos.nombre,
			estado_comentario: ordenes_fabricacion.estado_comentario
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

	const unidadesConAcciones = unidades.map((u) => ({
		...u,
		acciones: u.acciones
			? JSON.parse(u.acciones).filter((a) => a?.id !== null && a?.id !== undefined)
			: []
	}));

	return { ...orden, unidadesConAcciones };
});

// ============================================
// FORMS
// ============================================

export const crearOrdenFabricacion = form(CrearOrdenSchema, async (data) => {
	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);
	const user = await getCurrentUser();

	if (!user) throw new Error('No autorizado');

	const [orden] = await db
		.insert(ordenes_fabricacion)
		.values({
			nombre_trabajo: data.nombre_trabajo,
			cantidad_total: data.cantidad_total,
			estado_id: 1,
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
				estado_id: 1,
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

export const ejecutarAccionFabricacion = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		accion_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async (data) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		// 1. Obtener acción y unidad
		const result = await db
			.select({
				accion_id: acciones_fabricacion.id,
				estado_destino_id: acciones_fabricacion.estado_destino_id,
				estado_actual_id: unidades_fabricacion.estado_id,
				estado_anterior_id: unidades_fabricacion.estado_anterior_id,
				orden_id: unidades_fabricacion.orden_fabricacion_id,
				unidad_id: unidades_fabricacion.id
			})
			.from(acciones_fabricacion)
			.leftJoin(unidades_fabricacion, eq(unidades_fabricacion.id, data.unidad_id))
			.where(eq(acciones_fabricacion.id, data.accion_id))
			.get();

		if (!result || !result.orden_id) throw new Error('Acción no encontrada');

		let estadoDestino = result.estado_destino_id;

		// Reanudar: usar estado anterior
		if (result.accion_id === 7) {
			if (!result.estado_anterior_id) throw new Error('No hay estado anterior');
			estadoDestino = result.estado_anterior_id;
		}

		if (!estadoDestino) throw new Error('No hay estado destino');

		// 2. ACTUALIZAR LA UNIDAD PRIMERO
		const [unidad] = await db
			.update(unidades_fabricacion)
			.set({
				estado_id: estadoDestino,
				estado_anterior_id: result.estado_actual_id,
				estado_comentario: data.comentario,
				updated_at: new Date()
			})
			.where(eq(unidades_fabricacion.id, data.unidad_id))
			.returning();

		if (!unidad) throw new Error('Unidad no encontrada');

		// 3. CALCULAR EL ESTADO DE LA ORDEN CON LAS UNIDADES YA ACTUALIZADAS
		const [estadoResult] = await db
			.select({
				estado: sql<number>`
          CASE 
            WHEN COUNT(CASE WHEN ${estados_fabricacion.slug} = 'pausado' THEN 1 END) > 0 
              THEN (SELECT id FROM ${estados_fabricacion} WHERE slug = 'pausado')
            WHEN COUNT(*) = COUNT(CASE WHEN ${estados_fabricacion.es_final} = 1 THEN 1 END) 
              THEN (SELECT id FROM ${estados_fabricacion} WHERE slug = 'terminado')
            WHEN COUNT(CASE WHEN ${estados_fabricacion.slug} != 'preparando' THEN 1 END) = 0 
              THEN (SELECT id FROM ${estados_fabricacion} WHERE slug = 'preparando')
            ELSE (SELECT id FROM ${estados_fabricacion} WHERE slug = 'en_produccion')
          END
        `
			})
			.from(unidades_fabricacion)
			.leftJoin(estados_fabricacion, eq(unidades_fabricacion.estado_id, estados_fabricacion.id))
			.where(eq(unidades_fabricacion.orden_fabricacion_id, result.orden_id));

		// 4. ACTUALIZAR LA ORDEN CON EL NUEVO ESTADO
		await db
			.update(ordenes_fabricacion)
			.set({
				estado_id: estadoResult?.estado || 2,
				updated_at: new Date()
			})
			.where(eq(ordenes_fabricacion.id, result.orden_id));

		getOrdenFabricacion(result.orden_id).refresh();
		return { success: true };
	}
);

export const eliminarOrdenFabricacion = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		// Verificar que la orden no esté en estado final
		const orden = await db
			.select({ estado_id: ordenes_fabricacion.estado_id })
			.from(ordenes_fabricacion)
			.where(eq(ordenes_fabricacion.id, id))
			.get();

		if (!orden) throw new Error('Orden no encontrada');

		const estado = await db
			.select()
			.from(estados_fabricacion)
			.where(eq(estados_fabricacion.id, orden.estado_id))
			.get();

		if (estado?.es_final) {
			throw new Error('No se puede eliminar una orden ya entregada');
		}

		// Eliminar orden (cascade elimina unidades)
		await db.delete(ordenes_fabricacion).where(eq(ordenes_fabricacion.id, id));

		// Refrescar
		getOrdenesFabricacion({}).refresh();

		return { success: true };
	}
);
