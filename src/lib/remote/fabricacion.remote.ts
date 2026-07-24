import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import {
	ordenes_fabricacion,
	unidades_fabricacion,
	lineas_pedido,
	pedidos,
	productos,
	estados_fabricacion,
	empleados,
	clientes,
	transiciones_estado,
	logs_cambios_estado
} from '$lib/server/db/schema';
import { eq, desc, count, sql, and } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';
import { CrearOrdenSchema } from './fabricacion.schema';
import { getPedidos } from './pedidos.remote';

// ============================================================
// QUERIES
// ============================================================

export const getEstadosFabricacion = query(async () => {
	return db.select().from(estados_fabricacion).orderBy(estados_fabricacion.orden);
});

// Helper: dado un array de unidades, calcula el estado de la orden
function estadoOrdenFromUnidades(
	unidades: Array<{ estado_id: number }>,
	estados: Array<{
		id: number;
		nombre: string;
		slug: string;
		color: string | null;
		es_final: boolean | null;
	}>
) {
	const map = new Map(estados.map((e) => [e.id, e]));
	const estadosUnidad = unidades.map((u) => map.get(u.estado_id)!);

	// 1. Todas terminadas → Terminado
	if (estadosUnidad.every((e) => e.es_final)) {
		return estados.find((e) => e.slug === 'terminado')!;
	}
	// 2. Alguna en producción o limpieza → En producción
	if (estadosUnidad.some((e) => e.slug === 'en_produccion' || e.slug === 'limpieza')) {
		return estados.find((e) => e.slug === 'en_produccion')!;
	}
	// 3. Alguna pausada, ninguna en prod → Pausado
	if (estadosUnidad.some((e) => e.slug === 'pausado')) {
		return estados.find((e) => e.slug === 'pausado')!;
	}
	// 4. Default → Preparando material (o el estado que tengan todas)
	return estadosUnidad[0];
}

export const getOrdenesFabricacion = query(
	v.object({
		estado: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ estado, page, limit }) => {
		const offset = (page - 1) * limit;

		const [ordenesBase, estados] = await Promise.all([
			db
				.select({
					id: ordenes_fabricacion.id,
					nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
					cantidad_total: ordenes_fabricacion.cantidad_total,
					prioridad: ordenes_fabricacion.prioridad,
					fecha_inicio: ordenes_fabricacion.fecha_inicio,
					fecha_fin_estimada: ordenes_fabricacion.fecha_fin_estimada,
					asignado_a: ordenes_fabricacion.asignado_a,
					observaciones: ordenes_fabricacion.observaciones,
					linea_pedido_id: ordenes_fabricacion.linea_pedido_id
				})
				.from(ordenes_fabricacion)
				.orderBy(desc(ordenes_fabricacion.prioridad), desc(ordenes_fabricacion.id))
				.limit(limit)
				.offset(offset),
			db.select().from(estados_fabricacion)
		]);

		// Obtener unidades de todas las órdenes de una sola vez
		const ordenIds = ordenesBase.map((o) => o.id);
		const todasLasUnidades =
			ordenIds.length > 0
				? await db
						.select({
							orden_id: unidades_fabricacion.orden_fabricacion_id,
							estado_id: unidades_fabricacion.estado_id
						})
						.from(unidades_fabricacion)
						.where(sql`${unidades_fabricacion.orden_fabricacion_id} IN ${ordenIds}`)
				: [];

		// Agrupar unidades por orden
		const unidadesPorOrden = new Map<number, typeof todasLasUnidades>();
		for (const u of todasLasUnidades) {
			if (!unidadesPorOrden.has(u.orden_id)) unidadesPorOrden.set(u.orden_id, []);
			unidadesPorOrden.get(u.orden_id)!.push(u);
		}

		// Datos relacionados (cliente, producto, empleado)
		const relacionados = await db
			.select({
				orden_id: ordenes_fabricacion.id,
				pedido_id: pedidos.id,
				pedido_numero: pedidos.numero_pedido,
				cliente_nombre: clientes.nombre,
				producto_nombre: productos.nombre,
				empleado_nombre: empleados.nombre,
				empleado_apellido: empleados.apellido
			})
			.from(ordenes_fabricacion)
			.leftJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
			.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
			.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
			.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
			.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
			.where(sql`${ordenes_fabricacion.id} IN ${ordenIds}`);

		const relMap = new Map(relacionados.map((r) => [r.orden_id, r]));

		const ordenes = ordenesBase.map((o) => {
			const unidades = unidadesPorOrden.get(o.id) ?? [];
			const estadoCalculado = estadoOrdenFromUnidades(unidades, estados);
			const cantidadProducida = unidades.filter(
				(u) => estados.find((e) => e.id === u.estado_id)?.es_final
			).length;
			const rel = relMap.get(o.id);

			return {
				id: o.id,
				numero_orden: o.id,
				nombre_trabajo: o.nombre_trabajo,
				cantidad_total: o.cantidad_total,
				prioridad: o.prioridad,
				estado: {
					id: estadoCalculado.id,
					nombre: estadoCalculado.nombre,
					color: estadoCalculado.color,
					es_final: estadoCalculado.es_final
				},
				porcentaje_avance:
					o.cantidad_total > 0 ? Math.round((cantidadProducida / o.cantidad_total) * 100) : 0,
				fecha_inicio: o.fecha_inicio,
				fecha_fin_estimada: o.fecha_fin_estimada,
				asignado_a: o.asignado_a,
				empleado: rel?.empleado_nombre
					? {
							id: o.asignado_a,
							nombre: rel.empleado_nombre,
							apellido: rel.empleado_apellido
						}
					: null,
				pedido: rel?.pedido_id
					? {
							id: rel.pedido_id,
							numero: rel.pedido_numero
						}
					: null,
				producto_nombre: rel?.producto_nombre,
				observaciones: o.observaciones
			};
		});

		const ordenesFiltradas = estado ? ordenes.filter((o) => o.estado.id === estado) : ordenes;

		const [totalResult] = await db.select({ count: count() }).from(ordenes_fabricacion);

		return {
			ordenes: ordenesFiltradas,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getOrdenFabricacion = query(v.number(), async (id) => {
	const [orden, unidades, estados] = await Promise.all([
		db
			.select({
				id: ordenes_fabricacion.id,
				nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
				cantidad_total: ordenes_fabricacion.cantidad_total,
				prioridad: ordenes_fabricacion.prioridad,
				fecha_inicio: ordenes_fabricacion.fecha_inicio,
				fecha_fin_estimada: ordenes_fabricacion.fecha_fin_estimada,
				fecha_fin_real: ordenes_fabricacion.fecha_fin_real,
				asignado_a: ordenes_fabricacion.asignado_a,
				observaciones: ordenes_fabricacion.observaciones
			})
			.from(ordenes_fabricacion)
			.where(eq(ordenes_fabricacion.id, id))
			.then((rows) => rows[0]),
		db
			.select({
				id: unidades_fabricacion.id,
				numero_serie: unidades_fabricacion.numero_serie,
				estado_id: unidades_fabricacion.estado_id,
				historial_estados: unidades_fabricacion.historial_estados,
				es_defectuoso: unidades_fabricacion.es_defectuoso,
				defecto_descripcion: unidades_fabricacion.defecto_descripcion,
				observaciones: unidades_fabricacion.observaciones,
				comentario_estado: unidades_fabricacion.comentario_estado,
				created_at: unidades_fabricacion.created_at
			})
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.orden_fabricacion_id, id))
			.orderBy(unidades_fabricacion.id),
		db.select().from(estados_fabricacion)
	]);

	if (!orden) throw new Error('Orden no encontrada');

	const relacionados = await db
		.select({
			pedido_numero: pedidos.numero_pedido,
			cliente_nombre: clientes.nombre,
			producto_nombre: productos.nombre,
			empleado_nombre: empleados.nombre,
			empleado_apellido: empleados.apellido
		})
		.from(lineas_pedido)
		.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(ordenes_fabricacion, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
		.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
		.where(eq(ordenes_fabricacion.id, orden.id))
		.then((rows) => rows[0]);

	const estadoCalculado = estadoOrdenFromUnidades(unidades, estados);
	const cantidadProducida = unidades.filter(
		(u) => estados.find((e) => e.id === u.estado_id)?.es_final
	).length;

	// Transiciones disponibles para cada unidad
	const transiciones = await db
		.select()
		.from(transiciones_estado)
		.where(eq(transiciones_estado.tipo, 'fabricacion'));

	const unidadesConTransiciones = unidades.map((u) => {
		const estadoActual = estados.find((e) => e.id === u.estado_id)!;
		const destinosIds = transiciones
			.filter((t) => t.estado_origen_id === u.estado_id)
			.map((t) => t.estado_destino_id);
		const transicionesDisponibles = destinosIds.map((did) => estados.find((e) => e.id === did)!);

		return {
			...u,
			estado: estadoActual,
			transiciones_disponibles: transicionesDisponibles,
			esta_pausada: estadoActual.slug === 'pausado'
		};
	});

	return {
		...orden,
		estado: {
			id: estadoCalculado.id,
			nombre: estadoCalculado.nombre,
			color: estadoCalculado.color,
			es_final: estadoCalculado.es_final
		},
		porcentaje_avance:
			orden.cantidad_total > 0 ? Math.round((cantidadProducida / orden.cantidad_total) * 100) : 0,
		cantidad_producida: cantidadProducida,
		pedido_numero: relacionados?.pedido_numero,
		cliente_nombre: relacionados?.cliente_nombre,
		producto_nombre: relacionados?.producto_nombre,
		empleado: relacionados?.empleado_nombre
			? {
					nombre: relacionados.empleado_nombre,
					apellido: relacionados.empleado_apellido
				}
			: null,
		unidades: unidadesConTransiciones
	};
});

// ============================================================
// FORMS
// ============================================================

export const crearOrdenFabricacion = form(CrearOrdenSchema, async (data) => {
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const cantidadTotal = Number(data.cantidad_total);

	const [orden] = await db
		.insert(ordenes_fabricacion)
		.values({
			nombre_trabajo: data.nombre_trabajo,
			linea_pedido_id: data.linea_pedido_id,
			cantidad_total: cantidadTotal,
			prioridad: data.prioridad,
			fecha_fin_estimada: data.fecha_fin_estimada ? new Date(data.fecha_fin_estimada) : null,
			asignado_a: data.asignado_a || null,
			observaciones: data.observaciones
		})
		.returning();

	const estadoInicial = await db
		.select()
		.from(estados_fabricacion)
		.where(eq(estados_fabricacion.slug, 'preparando_material'))
		.then((rows) => rows[0]);

	if (!estadoInicial) throw new Error('Estado inicial no configurado');

	const unidades = [];
	for (let i = 1; i <= cantidadTotal; i++) {
		const [unidad] = await db
			.insert(unidades_fabricacion)
			.values({
				orden_fabricacion_id: orden.id,
				numero_serie: `${orden.id}-${i.toString().padStart(3, '0')}`,
				estado_id: estadoInicial.id,
				historial_estados: []
			})
			.returning();
		unidades.push(unidad);
	}

	return { success: true, orden, unidades };
});

// ============================================================
// COMMANDS
// ============================================================

export const cambiarEstadoUnidad = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		estado_destino_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async ({ unidad_id, estado_destino_id, comentario }) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const now = new Date();

		// 1. Obtener unidad
		const unidad = await db
			.select()
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.id, unidad_id))
			.then((rows) => rows[0]);

		if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

		// 2. Validar transición
		const transicion = await db
			.select()
			.from(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'fabricacion'),
					eq(transiciones_estado.estado_origen_id, unidad.estado_id),
					eq(transiciones_estado.estado_destino_id, estado_destino_id)
				)
			)
			.then((rows) => rows[0]);

		if (!transicion) {
			const [actual, destino] = await Promise.all([
				db
					.select()
					.from(estados_fabricacion)
					.where(eq(estados_fabricacion.id, unidad.estado_id))
					.then((r) => r[0]),
				db
					.select()
					.from(estados_fabricacion)
					.where(eq(estados_fabricacion.id, estado_destino_id))
					.then((r) => r[0])
			]);
			throw new Error(
				`Transición no permitida: ${actual?.nombre ?? '?'} → ${destino?.nombre ?? '?'}`
			);
		}

		// 3. Actualizar unidad
		const historial = unidad.historial_estados ?? [];
		historial.push({
			estado_id: unidad.estado_id,
			fecha: now.toISOString(),
			comentario: comentario ?? undefined
		});

		await db.transaction(async (tx) => {
			await tx
				.update(unidades_fabricacion)
				.set({
					estado_id: estado_destino_id,
					historial_estados: historial,
					comentario_estado: comentario ?? null,
					updated_at: now
				})
				.where(eq(unidades_fabricacion.id, unidad_id));

			await tx.insert(logs_cambios_estado).values({
				entidad_tipo: 'unidad',
				entidad_id: unidad_id,
				usuario_id: user.id,
				estado_anterior_id: unidad.estado_id,
				estado_nuevo_id: estado_destino_id,
				comentario: comentario ?? null,
				created_at: now
			});
		});

		// Refrescar
		Promise.all([
			getPedidos({ search: '', page: 1 }).refresh(),
			getOrdenFabricacion(unidad.orden_fabricacion_id).refresh()
		]).catch(() => {});

		return { success: true };
	}
);

export const reanudarUnidad = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async ({ unidad_id, comentario }) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const unidad = await db
			.select()
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.id, unidad_id))
			.then((rows) => rows[0]);

		if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

		const estadoActual = await db
			.select()
			.from(estados_fabricacion)
			.where(eq(estados_fabricacion.id, unidad.estado_id))
			.then((rows) => rows[0]);

		if (estadoActual?.slug !== 'pausado') {
			throw new Error(`La unidad no está pausada`);
		}

		// Buscar último estado no-pausado en el historial
		const historial = unidad.historial_estados ?? [];
		const estadoReanudar = historial
			.slice()
			.reverse()
			.find(async (h) => {
				const e = await db
					.select()
					.from(estados_fabricacion)
					.where(eq(estados_fabricacion.id, h.estado_id))
					.then((r) => r[0]);
				return e?.slug !== 'pausado';
			});

		if (!estadoReanudar) {
			throw new Error('No hay estado anterior para reanudar');
		}

		// Reusar el command de cambiar estado
		return cambiarEstadoUnidad({
			unidad_id: String(unidad_id),
			estado_destino_id: String(estadoReanudar.estado_id),
			comentario: comentario ?? `Reanudado desde ${estadoActual.nombre}`
		});
	}
);

export const eliminarOrdenFabricacion = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const unidades = await db
			.select({ estado_id: unidades_fabricacion.estado_id })
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.orden_fabricacion_id, id));

		const estadosFinales = await db
			.select({ id: estados_fabricacion.id })
			.from(estados_fabricacion)
			.where(eq(estados_fabricacion.es_final, true))
			.then((rows) => new Set(rows.map((r) => r.id)));

		const algunaFinal = unidades.some((u) => estadosFinales.has(u.estado_id));
		if (algunaFinal) {
			throw new Error('No se puede eliminar una orden con unidades terminadas');
		}

		await db.transaction(async (tx) => {
			await tx
				.delete(unidades_fabricacion)
				.where(eq(unidades_fabricacion.orden_fabricacion_id, id));
			await tx.delete(ordenes_fabricacion).where(eq(ordenes_fabricacion.id, id));
		});

		getOrdenesFabricacion({}).refresh();

		return { success: true };
	}
);
