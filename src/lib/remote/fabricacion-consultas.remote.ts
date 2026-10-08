import * as v from 'valibot';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import {
	adjuntos_cotizacion,
	cotizaciones,
	estados_fabricacion,
	empleados,
	contactos,
	ordenes_fabricacion,
	unidades_fabricacion,
	lineas_pedido,
	pedidos,
	productos,
	insumos,
	pedido_insumos,
	transiciones_estado,
	logs_cambios_estado,
	usuarios
} from '$lib/server/db/schema';
import { and, aliasedTable, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { getProductoConReceta } from './productos.remote';

export const getEstadosFabricacion = query(async () =>
	db.select().from(estados_fabricacion).orderBy(estados_fabricacion.orden)
);

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
	const map = new Map(estados.map((estado) => [estado.id, estado]));
	const estadosUnidad = unidades.map((unidad) => map.get(unidad.estado_id)!);

	if (estadosUnidad.every((estado) => estado.es_final)) {
		return estados.find((estado) => estado.slug === 'terminado')!;
	}
	if (
		estadosUnidad.some((estado) => estado.slug === 'en_produccion' || estado.slug === 'limpieza')
	) {
		return estados.find((estado) => estado.slug === 'en_produccion')!;
	}
	if (estadosUnidad.some((estado) => estado.slug === 'pausado')) {
		return estados.find((estado) => estado.slug === 'pausado')!;
	}
	return estadosUnidad[0];
}

export const getOrdenesFabricacion = query(
	v.object({
		search: v.optional(v.string()),
		estado: v.optional(v.number()),
		soloActivas: v.optional(v.boolean(), false),
		page: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ search, estado, soloActivas, page, limit }) => {
		const offset = (page - 1) * limit;
		const searchTerm = search?.trim() ? `%${search.trim()}%` : undefined;
		const searchCondition = searchTerm
			? or(
					ilike(ordenes_fabricacion.nombre_trabajo, searchTerm),
					ilike(pedidos.numero_pedido, searchTerm),
					ilike(contactos.razon_social, searchTerm),
					ilike(productos.nombre, searchTerm)
				)
			: undefined;

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
				.leftJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
				.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
				.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
				.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
				.where(searchCondition)
				.orderBy(desc(ordenes_fabricacion.prioridad), desc(ordenes_fabricacion.id))
				.limit(limit)
				.offset(offset),
			db.select().from(estados_fabricacion)
		]);

		const ordenIds = ordenesBase.map((orden) => orden.id);
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

		const unidadesPorOrden = new Map<number, typeof todasLasUnidades>();
		for (const unidad of todasLasUnidades) {
			if (!unidadesPorOrden.has(unidad.orden_id)) unidadesPorOrden.set(unidad.orden_id, []);
			unidadesPorOrden.get(unidad.orden_id)!.push(unidad);
		}

		const relacionados =
			ordenIds.length > 0
				? await db
						.select({
							orden_id: ordenes_fabricacion.id,
							pedido_id: pedidos.id,
							pedido_numero: pedidos.numero_pedido,
							cliente_nombre: contactos.razon_social,
							producto_nombre: productos.nombre,
							empleado_nombre: empleados.nombre,
							empleado_apellido: empleados.apellido
						})
						.from(ordenes_fabricacion)
						.leftJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
						.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
						.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
						.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
						.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
						.where(sql`${ordenes_fabricacion.id} IN ${ordenIds}`)
				: [];
		const relacionPorOrden = new Map(relacionados.map((relacion) => [relacion.orden_id, relacion]));

		let ordenes = ordenesBase.map((orden) => {
			const unidades = unidadesPorOrden.get(orden.id) ?? [];
			const estadoCalculado = estadoOrdenFromUnidades(unidades, estados);
			const cantidadProducida = unidades.filter(
				(unidad) => estados.find((estado) => estado.id === unidad.estado_id)?.es_final
			).length;
			const relacionado = relacionPorOrden.get(orden.id);

			return {
				id: orden.id,
				numero_orden: orden.id,
				nombre_trabajo: orden.nombre_trabajo,
				cantidad_total: orden.cantidad_total,
				prioridad: orden.prioridad,
				estado: {
					id: estadoCalculado.id,
					nombre: estadoCalculado.nombre,
					color: estadoCalculado.color,
					es_final: estadoCalculado.es_final
				},
				cantidad_producida: cantidadProducida,
				fecha_inicio: orden.fecha_inicio,
				fecha_fin_estimada: orden.fecha_fin_estimada,
				asignado_a: orden.asignado_a,
				empleado: relacionado?.empleado_nombre
					? {
							id: orden.asignado_a,
							nombre: relacionado.empleado_nombre,
							apellido: relacionado.empleado_apellido
						}
					: null,
				cliente_nombre: relacionado?.cliente_nombre || null,
				pedido: relacionado?.pedido_id
					? { id: relacionado.pedido_id, numero: relacionado.pedido_numero }
					: null,
				producto_nombre: relacionado?.producto_nombre,
				observaciones: orden.observaciones
			};
		});

		if (soloActivas) ordenes = ordenes.filter((orden) => !orden.estado.es_final);
		const ordenesFiltradas = estado
			? ordenes.filter((orden) => orden.estado.id === estado)
			: ordenes;
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
				linea_pedido_id: ordenes_fabricacion.linea_pedido_id,
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
			pedido_id: pedidos.id,
			pedido_numero: pedidos.numero_pedido,
			cliente_nombre: contactos.razon_social,
			producto_nombre: productos.nombre,
			empleado_nombre: empleados.nombre,
			empleado_apellido: empleados.apellido
		})
		.from(lineas_pedido)
		.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(ordenes_fabricacion, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
		.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id))
		.where(eq(ordenes_fabricacion.id, orden.id))
		.then((rows) => rows[0]);

	const [cotizacion] = relacionados?.pedido_id
		? await db
				.select({ id: cotizaciones.id })
				.from(cotizaciones)
				.where(eq(cotizaciones.pedido_id, relacionados.pedido_id))
				.limit(1)
		: [];

	const [lineaTrabajo] = await db
		.select({
			pedido_id: lineas_pedido.pedido_id,
			producto_id: lineas_pedido.producto_id,
			descripcion: lineas_pedido.descripcion_personalizada,
			insumos_snapshot: lineas_pedido.insumos_snapshot,
			medidas: {
				primario_diametro: lineas_pedido.medidas_primario_diametro,
				primario_largo: lineas_pedido.medidas_primario_largo,
				secundario_diametro: lineas_pedido.medidas_secundario_diametro,
				secundario_largo: lineas_pedido.medidas_secundario_largo,
				trombon_diametro_inicial: lineas_pedido.trombon_diametro_inicial,
				trombon_largo: lineas_pedido.trombon_largo,
				trombon_observaciones: lineas_pedido.trombon_observaciones
			},
			producto: {
				id: productos.id,
				nombre: productos.nombre,
				codigo: productos.codigo,
				medidas_primario_diametro: productos.medidas_primario_diametro,
				medidas_primario_largo: productos.medidas_primario_largo,
				medidas_secundario_diametro: productos.medidas_secundario_diametro,
				medidas_secundario_largo: productos.medidas_secundario_largo,
				trombon_diametro_inicial: productos.trombon_diametro_inicial,
				trombon_largo: productos.trombon_largo,
				trombon_observaciones: productos.trombon_observaciones
			}
		})
		.from(lineas_pedido)
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.where(eq(lineas_pedido.id, orden.linea_pedido_id))
		.limit(1);

	const recetaActual = lineaTrabajo?.producto_id
		? (await getProductoConReceta(lineaTrabajo.producto_id)).receta
		: [];
	const insumosAdicionales = lineaTrabajo?.pedido_id
		? await db
				.select({
					id: pedido_insumos.id,
					insumo_id: pedido_insumos.insumo_id,
					codigo: insumos.codigo,
					nombre: insumos.nombre,
					cantidad: pedido_insumos.cantidad,
					unidad: pedido_insumos.unidad,
					costo_unitario: pedido_insumos.costo_unitario
				})
				.from(pedido_insumos)
				.innerJoin(insumos, eq(pedido_insumos.insumo_id, insumos.id))
				.where(eq(pedido_insumos.pedido_id, lineaTrabajo.pedido_id))
		: [];
	const adjuntos = lineaTrabajo?.pedido_id
		? await db
				.select({
					id: adjuntos_cotizacion.id,
					nombre_original: adjuntos_cotizacion.nombre_original,
					archivo_url: adjuntos_cotizacion.archivo_url,
					mime_type: adjuntos_cotizacion.mime_type
				})
				.from(adjuntos_cotizacion)
				.innerJoin(cotizaciones, eq(cotizaciones.id, adjuntos_cotizacion.cotizacion_id))
				.where(eq(cotizaciones.pedido_id, lineaTrabajo.pedido_id))
				.orderBy(desc(adjuntos_cotizacion.id))
		: [];

	type MaterialRequerido = {
		insumo_id: number;
		codigo: string;
		nombre: string;
		cantidad: number;
		unidad: string;
		costo_unitario?: number | null;
		subtotal?: number;
	};
	const recetaBase = (
		Array.isArray(lineaTrabajo?.insumos_snapshot) ? lineaTrabajo.insumos_snapshot : recetaActual
	) as MaterialRequerido[];
	const insumosRequeridos = recetaBase.map((material) => ({
		...material,
		cantidad: material.cantidad * orden.cantidad_total,
		subtotal: Number(
			(material.cantidad * orden.cantidad_total * (material.costo_unitario ?? 0)).toFixed(2)
		)
	}));
	const medidasProducto = lineaTrabajo?.producto;
	const medidas = Object.fromEntries(
		Object.entries(lineaTrabajo?.medidas ?? {}).map(([key, value]) => [
			key,
			value ?? medidasProducto?.[key as keyof typeof medidasProducto] ?? null
		])
	);
	const estadoCalculado = estadoOrdenFromUnidades(unidades, estados);
	const cantidadProducida = unidades.filter(
		(unidad) => estados.find((estado) => estado.id === unidad.estado_id)?.es_final
	).length;
	const transiciones = await db
		.select()
		.from(transiciones_estado)
		.where(eq(transiciones_estado.tipo, 'fabricacion'));
	const unidadesConTransiciones = unidades.map((unidad) => {
		const estadoActual = estados.find((estado) => estado.id === unidad.estado_id)!;
		const destinosIds = transiciones
			.filter((transicion) => transicion.estado_origen_id === unidad.estado_id)
			.map((transicion) => transicion.estado_destino_id);
		const transicionesDisponibles = destinosIds.map(
			(destinoId) => estados.find((estado) => estado.id === destinoId)!
		);
		return {
			...unidad,
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
		cantidad_producida: cantidadProducida,
		pedido_numero: relacionados?.pedido_numero,
		navegacion: {
			cotizacion_id: cotizacion?.id ?? null,
			pedido_id: relacionados?.pedido_id ?? null,
			orden_fabricacion_id: orden.id
		},
		cliente_nombre: relacionados?.cliente_nombre,
		producto_nombre: relacionados?.producto_nombre,
		producto: lineaTrabajo?.producto ?? null,
		descripcion_producto: lineaTrabajo?.descripcion ?? null,
		medidas,
		insumos_requeridos: insumosRequeridos,
		insumos_adicionales: insumosAdicionales,
		adjuntos,
		empleado: relacionados?.empleado_nombre
			? {
					nombre: relacionados.empleado_nombre,
					apellido: relacionados.empleado_apellido
				}
			: null,
		unidades: unidadesConTransiciones
	};
});

export const getHistorialUnidades = query(v.number(), async (ordenId) => {
	const unidades = await db
		.select({ id: unidades_fabricacion.id })
		.from(unidades_fabricacion)
		.where(eq(unidades_fabricacion.orden_fabricacion_id, ordenId));
	if (unidades.length === 0) return [];

	const ids = unidades.map((unidad) => unidad.id);
	const estadoAnterior = aliasedTable(estados_fabricacion, 'estado_anterior');
	const estadoNuevo = aliasedTable(estados_fabricacion, 'estado_nuevo');

	return db
		.select({
			id: logs_cambios_estado.id,
			unidad: unidades_fabricacion.numero_serie,
			estado_anterior: {
				nombre: estadoAnterior.nombre,
				color: estadoAnterior.color
			},
			estado_nuevo: {
				nombre: estadoNuevo.nombre,
				color: estadoNuevo.color
			},
			comentario: logs_cambios_estado.comentario,
			fecha: logs_cambios_estado.created_at,
			empleado: empleados.nombre
		})
		.from(logs_cambios_estado)
		.leftJoin(unidades_fabricacion, eq(logs_cambios_estado.entidad_id, unidades_fabricacion.id))
		.leftJoin(usuarios, eq(logs_cambios_estado.usuario_id, usuarios.id))
		.leftJoin(empleados, eq(usuarios.empleado_id, empleados.id))
		.leftJoin(estadoAnterior, eq(logs_cambios_estado.estado_anterior_id, estadoAnterior.id))
		.leftJoin(estadoNuevo, eq(logs_cambios_estado.estado_nuevo_id, estadoNuevo.id))
		.where(
			and(
				eq(logs_cambios_estado.entidad_tipo, 'unidad'),
				sql`${logs_cambios_estado.entidad_id} IN ${ids}`
			)
		)
		.orderBy(desc(logs_cambios_estado.created_at));
});
