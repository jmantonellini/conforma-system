import * as v from 'valibot';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import {
	adjuntos_cotizacion,
	cotizaciones,
	estados_cotizacion,
	empleados,
	insumos,
	lineas_cotizacion,
	lineas_pedido,
	logs_cambios_estado,
	notas_cotizacion,
	ordenes_fabricacion,
	productos,
	transiciones_estado,
	usuarios,
	contactos
} from '$lib/server/db/schema';
import { and, aliasedTable, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';

const crearCondicionBusquedaCotizacion = ({
	search,
	estadoId,
	asignadaA
}: {
	search?: string;
	estadoId?: number;
	asignadaA?: number;
}) => {
	const condiciones = [];

	if (search) {
		const termino = `%${search}%`;
		condiciones.push(
			or(
				ilike(cotizaciones.numero_cotizacion, termino),
				ilike(cotizaciones.cliente_nombre, termino),
				ilike(contactos.razon_social, termino),
				ilike(contactos.cuit, termino)
			)
		);
	}

	if (estadoId) condiciones.push(eq(cotizaciones.estado_id, estadoId));
	if (asignadaA) condiciones.push(eq(cotizaciones.asignada_a, asignadaA));

	return condiciones.length ? and(...condiciones) : undefined;
};

export const getCotizaciones = query(
	v.object({
		search: v.optional(v.string()),
		estadoId: v.optional(v.number()),
		asignadaA: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({ search, estadoId, asignadaA, page = 1, limit = 10 }) => {
		await requirePermission('cotizaciones', 'view');
		const offset = (page - 1) * limit;
		const where = crearCondicionBusquedaCotizacion({ search, estadoId, asignadaA });

		const data = await db
			.select({
				id: cotizaciones.id,
				numero_cotizacion: cotizaciones.numero_cotizacion,
				cliente_nombre: sql<string>`
					COALESCE(
						${contactos.razon_social},
						${cotizaciones.cliente_nombre}
					)`.as('cliente_nombre'),
				canal: cotizaciones.canal,
				created_at: cotizaciones.created_at,
				precio_total: cotizaciones.precio_total,
				estado_id: cotizaciones.estado_id,
				estado_nombre: estados_cotizacion.nombre,
				estado_color: estados_cotizacion.color,
				estado_slug: estados_cotizacion.slug,
				asignado_nombre: empleados.nombre,
				asignado_apellido: empleados.apellido
			})
			.from(cotizaciones)
			.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
			.leftJoin(estados_cotizacion, eq(cotizaciones.estado_id, estados_cotizacion.id))
			.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
			.where(where)
			.orderBy(desc(cotizaciones.id))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db.select({ count: count() }).from(cotizaciones).where(where);

		return {
			data,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getCotizacionById = query(v.number(), async (id) => {
	await requirePermission('cotizaciones', 'view');
	const [cotizacion] = await db
		.select({
			id: cotizaciones.id,
			numero_cotizacion: cotizaciones.numero_cotizacion,
			canal: cotizaciones.canal,
			descripcion: cotizaciones.descripcion,
			observaciones: cotizaciones.observaciones,
			precio_total: cotizaciones.precio_total,
			incluir_iva: cotizaciones.incluir_iva,
			condiciones_pago: cotizaciones.condiciones_pago,
			validez_dias: cotizaciones.validez_dias,
			fecha_envio: cotizaciones.fecha_envio,
			created_at: cotizaciones.created_at,
			pedido_id: cotizaciones.pedido_id,
			cliente: {
				id: contactos.id,
				nombre: contactos.razon_social,
				apellido: sql<string | null>`NULL`,
				razon_social: contactos.razon_social,
				telefono: contactos.telefono,
				email: contactos.email
			},
			cliente_nombre: cotizaciones.cliente_nombre,
			cliente_telefono: cotizaciones.cliente_telefono,
			cliente_email: cotizaciones.cliente_email,
			estado: {
				id: cotizaciones.estado_id,
				nombre: estados_cotizacion.nombre,
				color: estados_cotizacion.color,
				slug: estados_cotizacion.slug
			},
			asignado: {
				id: empleados.id,
				nombre: empleados.nombre,
				apellido: empleados.apellido
			},
			creada_por: usuarios.username
		})
		.from(cotizaciones)
		.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
		.leftJoin(estados_cotizacion, eq(cotizaciones.estado_id, estados_cotizacion.id))
		.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
		.leftJoin(usuarios, eq(cotizaciones.creada_por, usuarios.id))
		.where(eq(cotizaciones.id, id))
		.limit(1);

	if (!cotizacion) throw new Error('Cotización no encontrada');

	const [transiciones, lineas, adjuntos, ordenes] = await Promise.all([
		db
			.select({
				id: transiciones_estado.id,
				estado_destino_id: transiciones_estado.estado_destino_id,
				destino_nombre: estados_cotizacion.nombre,
				destino_slug: estados_cotizacion.slug,
				destino_color: estados_cotizacion.color
			})
			.from(transiciones_estado)
			.innerJoin(
				estados_cotizacion,
				eq(transiciones_estado.estado_destino_id, estados_cotizacion.id)
			)
			.where(
				and(
					eq(transiciones_estado.tipo, 'cotizacion'),
					eq(transiciones_estado.estado_origen_id, cotizacion.estado.id)
				)
			),
		db
			.select({
				id: lineas_cotizacion.id,
				producto_id: lineas_cotizacion.producto_id,
				insumo_id: lineas_cotizacion.insumo_id,
				producto_nombre: productos.nombre,
				insumo_nombre: insumos.nombre,
				insumo_unidad: insumos.unidad,
				es_personalizado: lineas_cotizacion.es_personalizado,
				descripcion: lineas_cotizacion.descripcion,
				cantidad: lineas_cotizacion.cantidad,
				precio_unitario: lineas_cotizacion.precio_unitario,
				precio_lista_unitario: lineas_cotizacion.precio_lista_unitario,
				margen_porcentaje: lineas_cotizacion.margen_porcentaje,
				descuento_porcentaje: lineas_cotizacion.descuento_porcentaje,
				justificacion_descuento: lineas_cotizacion.justificacion_descuento,
				subtotal: lineas_cotizacion.subtotal,
				costo_mano_obra: lineas_cotizacion.costo_mano_obra,
				costo_materiales: lineas_cotizacion.costo_materiales,
				insumos_snapshot: lineas_cotizacion.insumos_snapshot
			})
			.from(lineas_cotizacion)
			.leftJoin(productos, eq(lineas_cotizacion.producto_id, productos.id))
			.leftJoin(insumos, eq(lineas_cotizacion.insumo_id, insumos.id))
			.where(eq(lineas_cotizacion.cotizacion_id, id))
			.orderBy(lineas_cotizacion.orden_linea),
		db
			.select()
			.from(adjuntos_cotizacion)
			.where(eq(adjuntos_cotizacion.cotizacion_id, id))
			.orderBy(desc(adjuntos_cotizacion.id)),
		cotizacion.pedido_id
			? db
					.select({ id: ordenes_fabricacion.id })
					.from(ordenes_fabricacion)
					.innerJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
					.where(eq(lineas_pedido.pedido_id, cotizacion.pedido_id))
					.limit(2)
			: Promise.resolve([])
	]);

	return {
		cotizacion: {
			...cotizacion,
			transiciones,
			navegacion: {
				pedido_id: cotizacion.pedido_id,
				orden_fabricacion_id: ordenes.length === 1 ? ordenes[0].id : null
			}
		},
		lineas,
		adjuntos
	};
});

export const getEstadosCotizacion = query(async () => {
	await requirePermission('cotizaciones', 'view');
	return db.select().from(estados_cotizacion).orderBy(estados_cotizacion.orden);
});

export const getHistorialCotizacion = query(v.number(), async (cotizacionId) => {
	await requirePermission('cotizaciones', 'view');
	const estadoAnterior = aliasedTable(estados_cotizacion, 'estado_anterior');
	const estadoNuevo = aliasedTable(estados_cotizacion, 'estado_nuevo');

	return db
		.select({
			id: logs_cambios_estado.id,
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
		.leftJoin(usuarios, eq(logs_cambios_estado.usuario_id, usuarios.id))
		.leftJoin(empleados, eq(usuarios.empleado_id, empleados.id))
		.leftJoin(estadoAnterior, eq(logs_cambios_estado.estado_anterior_id, estadoAnterior.id))
		.leftJoin(estadoNuevo, eq(logs_cambios_estado.estado_nuevo_id, estadoNuevo.id))
		.where(
			and(
				eq(logs_cambios_estado.entidad_tipo, 'cotizacion'),
				eq(logs_cambios_estado.entidad_id, cotizacionId)
			)
		)
		.orderBy(desc(logs_cambios_estado.created_at));
});

export const getNotasCotizacion = query(v.number(), async (cotizacionId) => {
	await requirePermission('cotizaciones', 'view');

	return db
		.select({
			id: notas_cotizacion.id,
			contenido: notas_cotizacion.contenido,
			fecha: notas_cotizacion.created_at,
			autor: sql<string>`coalesce(nullif(concat_ws(' ', ${empleados.nombre}, ${empleados.apellido}), ''), 'Usuario')`
		})
		.from(notas_cotizacion)
		.leftJoin(usuarios, eq(notas_cotizacion.usuario_id, usuarios.id))
		.leftJoin(empleados, eq(usuarios.empleado_id, empleados.id))
		.where(eq(notas_cotizacion.cotizacion_id, cotizacionId))
		.orderBy(desc(notas_cotizacion.created_at));
});
