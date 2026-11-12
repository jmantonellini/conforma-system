import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	estados,
	empleados,
	contactos,
	ordenes_fabricacion,
	unidades_fabricacion,
	lineas_pedido,
	pedidos,
	productos,
	insumos,
	pedido_insumos,
	transiciones_estado
} from '$lib/server/db/schema';
import { aliasedTable, and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';
import { historialEstados, listarEstados } from '$lib/server/estados';
import { listarAdjuntosRelacionados } from '$lib/modulos/adjuntos/adjuntos.server';
import { estadoDeOrden, resumenOrdenes } from '$lib/modulos/fabricacion/fabricacion.server';
import {
	getAtributosCategoriaService,
	getProductoConRecetaService
} from '$lib/modulos/productos/productos.server';
import type { MaterialSnapshot } from '$lib/modulos/ventas/tipos';
import { agruparAtributos, gruposConValor } from '$lib/modulos/productos/atributos';

export const getEstadosFabricacion = query(async () => {
	await requirePermission('fabricacion', 'view');
	return listarEstados('fabricacion');
});

function consultaOrdenes() {
	const resumen = resumenOrdenes();
	const { estadoOrden, condicion } = estadoDeOrden(resumen);
	const productoStock = aliasedTable(productos, 'producto_stock');
	const consulta = db
		.select({
			id: ordenes_fabricacion.id,
			numero_orden: ordenes_fabricacion.id,
			nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
			cantidad_total: ordenes_fabricacion.cantidad_total,
			prioridad: ordenes_fabricacion.prioridad,
			fecha_inicio: ordenes_fabricacion.fecha_inicio,
			fecha_fin_estimada: ordenes_fabricacion.fecha_fin_estimada,
			asignado_a: ordenes_fabricacion.asignado_a,
			observaciones: ordenes_fabricacion.observaciones,
			es_para_stock: ordenes_fabricacion.es_para_stock,
			producto_id: ordenes_fabricacion.producto_id,
			linea_pedido_id: ordenes_fabricacion.linea_pedido_id,
			fecha_fin_real: ordenes_fabricacion.fecha_fin_real,
			created_at: ordenes_fabricacion.created_at,
			estado: {
				id: estadoOrden.id,
				nombre: estadoOrden.nombre,
				color: estadoOrden.color,
				es_final: estadoOrden.es_final
			},
			cantidad_producida: sql<number>`COALESCE(${resumen.terminadas}, 0)`,
			cliente_nombre: contactos.razon_social,
			pedido_id: pedidos.id,
			pedido_numero: pedidos.numero_pedido,
			producto_nombre: sql<string | null>`COALESCE(${productos.nombre}, ${productoStock.nombre})`,
			empleado_nombre: empleados.nombre,
			empleado_apellido: empleados.apellido,
			total_filas: sql<number>`count(*) over()::int`
		})
		.from(ordenes_fabricacion)
		.leftJoin(resumen, eq(resumen.orden_id, ordenes_fabricacion.id))
		.leftJoin(estadoOrden, condicion)
		.leftJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
		.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(productoStock, eq(ordenes_fabricacion.producto_id, productoStock.id))
		.leftJoin(empleados, eq(ordenes_fabricacion.asignado_a, empleados.id));
	return { consulta, estadoOrden, productoStock };
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
		await requirePermission('fabricacion', 'view');
		const { consulta, estadoOrden, productoStock } = consultaOrdenes();
		const termino = search?.trim() ? `%${search.trim()}%` : undefined;
		const where = and(
			termino
				? or(
						ilike(ordenes_fabricacion.nombre_trabajo, termino),
						ilike(pedidos.numero_pedido, termino),
						ilike(contactos.razon_social, termino),
						ilike(productos.nombre, termino),
						ilike(productoStock.nombre, termino)
					)
				: undefined,
			estado ? eq(estadoOrden.id, estado) : undefined,
			soloActivas ? eq(estadoOrden.es_final, false) : undefined
		);

		const filas = await consulta
			.where(where)
			.orderBy(desc(ordenes_fabricacion.prioridad), desc(ordenes_fabricacion.id))
			.limit(limit)
			.offset((page - 1) * limit);
		const total = filas[0]?.total_filas ?? 0;

		return {
			ordenes: filas.map(
				({
					pedido_id,
					pedido_numero,
					empleado_nombre,
					empleado_apellido,
					total_filas,
					...orden
				}) => ({
					...orden,
					pedido: pedido_id ? { id: pedido_id, numero: pedido_numero } : null,
					empleado: empleado_nombre
						? { id: orden.asignado_a, nombre: empleado_nombre, apellido: empleado_apellido }
						: null
				})
			),
			total,
			totalPages: Math.ceil(total / limit),
			currentPage: page
		};
	}
);

export const getOrdenFabricacion = query(v.number(), async (id) => {
	await requirePermission('fabricacion', 'view');
	const { consulta } = consultaOrdenes();
	const [orden] = await consulta.where(eq(ordenes_fabricacion.id, id));
	if (!orden) error(404, 'Orden no encontrada');

	const producto = aliasedTable(productos, 'producto_trabajo');
	const productoId = sql<
		number | null
	>`COALESCE(${lineas_pedido.producto_id}, ${ordenes_fabricacion.producto_id})`;
	const [[trabajo], [cotizacion], unidades, transiciones] = await Promise.all([
		db
			.select({
				producto_id: productoId,
				descripcion: lineas_pedido.descripcion_personalizada,
				insumos_snapshot: lineas_pedido.insumos_snapshot,
				atributos_linea: lineas_pedido.atributos,
				producto: {
					id: producto.id,
					nombre: producto.nombre,
					codigo: producto.codigo,
					categoria_id: producto.categoria_id,
					notas_fabricacion: producto.notas_fabricacion,
					atributos: producto.atributos
				}
			})
			.from(ordenes_fabricacion)
			.leftJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
			.leftJoin(producto, eq(producto.id, productoId))
			.where(eq(ordenes_fabricacion.id, id)),
		orden.pedido_id
			? db
					.select({ id: cotizaciones.id })
					.from(cotizaciones)
					.where(eq(cotizaciones.pedido_id, orden.pedido_id))
					.limit(1)
			: [],
		db
			.select({
				id: unidades_fabricacion.id,
				numero_serie: unidades_fabricacion.numero_serie,
				estado_id: unidades_fabricacion.estado_id,
				es_defectuoso: unidades_fabricacion.es_defectuoso,
				defecto_descripcion: unidades_fabricacion.defecto_descripcion,
				observaciones: unidades_fabricacion.observaciones,
				comentario_estado: unidades_fabricacion.comentario_estado,
				created_at: unidades_fabricacion.created_at,
				estado: estados
			})
			.from(unidades_fabricacion)
			.innerJoin(estados, eq(estados.id, unidades_fabricacion.estado_id))
			.where(eq(unidades_fabricacion.orden_fabricacion_id, id))
			.orderBy(unidades_fabricacion.id),
		db
			.select({ origen_id: transiciones_estado.estado_origen_id, destino: estados })
			.from(transiciones_estado)
			.innerJoin(estados, eq(estados.id, transiciones_estado.estado_destino_id))
			.where(eq(estados.flujo, 'fabricacion'))
			.orderBy(asc(estados.orden))
	]);

	const [receta, insumosAdicionales, adjuntos, definiciones] = await Promise.all([
		Array.isArray(trabajo?.insumos_snapshot)
			? (trabajo.insumos_snapshot as MaterialSnapshot[])
			: trabajo?.producto_id
				? getProductoConRecetaService(trabajo.producto_id).then(({ receta }) => receta)
				: [],
		orden.pedido_id
			? db
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
					.where(eq(pedido_insumos.pedido_id, orden.pedido_id))
			: [],
		listarAdjuntosRelacionados({
			ordenIds: [id],
			pedidoId: orden.pedido_id,
			cotizacionId: cotizacion?.id,
			productoPlanosId: trabajo?.producto_id
		}),
		getAtributosCategoriaService(trabajo?.producto?.categoria_id)
	]);

	const { pedido_id, pedido_numero, empleado_nombre, empleado_apellido, total_filas, ...datos } =
		orden;
	const productoTrabajo = trabajo?.producto;
	return {
		...datos,
		pedido_id,
		pedido_numero,
		navegacion: { cotizacion_id: cotizacion?.id ?? null, pedido_id, orden_fabricacion_id: id },
		producto: productoTrabajo?.id
			? {
					id: productoTrabajo.id,
					nombre: productoTrabajo.nombre,
					codigo: productoTrabajo.codigo,
					notas_fabricacion: productoTrabajo.notas_fabricacion
				}
			: null,
		descripcion_producto: trabajo?.descripcion ?? null,
		atributos: gruposConValor(
			agruparAtributos(definiciones, { ...productoTrabajo?.atributos, ...trabajo?.atributos_linea })
		),
		insumos_requeridos: (receta as MaterialSnapshot[]).map((material) => ({
			...material,
			cantidad: material.cantidad * orden.cantidad_total,
			subtotal: Number(
				(material.cantidad * orden.cantidad_total * (material.costo_unitario ?? 0)).toFixed(2)
			)
		})),
		insumos_adicionales: insumosAdicionales,
		adjuntos,
		empleado: empleado_nombre ? { nombre: empleado_nombre, apellido: empleado_apellido } : null,
		unidades: unidades.map((unidad) => ({
			...unidad,
			transiciones_disponibles: transiciones
				.filter((transicion) => transicion.origen_id === unidad.estado_id)
				.map((transicion) => transicion.destino),
			esta_pausada: unidad.estado.slug === 'pausado'
		}))
	};
});

export const getHistorialUnidades = query(v.number(), async (ordenId) => {
	await requirePermission('fabricacion', 'view');
	const unidades = await db
		.select({ id: unidades_fabricacion.id, numero_serie: unidades_fabricacion.numero_serie })
		.from(unidades_fabricacion)
		.where(eq(unidades_fabricacion.orden_fabricacion_id, ordenId));
	if (!unidades.length) return [];

	const series = new Map(unidades.map((unidad) => [unidad.id, unidad.numero_serie]));
	const historial = await historialEstados('fabricacion', [...series.keys()]);
	return historial.map(({ entidad_id, ...log }) => ({ ...log, unidad: series.get(entidad_id) }));
});
