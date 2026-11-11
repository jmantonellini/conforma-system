import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	estados,
	empleados,
	insumos,
	lineas_cotizacion,
	lineas_pedido,
	notas_cotizacion,
	ordenes_fabricacion,
	usuarios,
	contactos
} from '$lib/server/db/schema';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { ocultar, puedeVerImportes, requirePermission } from '$lib/server/auth/permissions';
import { historialEstados, listarEstados, transicionesDesde } from '$lib/server/estados';
import { listarAdjuntosRelacionados } from '$lib/server/services/adjuntos.service';
import type { MaterialSnapshot } from '$lib/types/cotizacion-editor';

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
				ilike(contactos.razon_social, termino),
				ilike(contactos.nombre, termino),
				ilike(contactos.apellido, termino),
				ilike(contactos.telefono, termino),
				ilike(contactos.email, termino),
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
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ search, estadoId, asignadaA, page = 1, limit = 20 }) => {
		const user = await requirePermission('cotizaciones', 'view');
		const offset = (page - 1) * limit;
		const where = crearCondicionBusquedaCotizacion({ search, estadoId, asignadaA });

		const data = await db
			.select({
				id: cotizaciones.id,
				numero_cotizacion: cotizaciones.numero_cotizacion,
				cliente_nombre: contactos.razon_social,
				canal: cotizaciones.canal,
				created_at: cotizaciones.created_at,
				precio_total: cotizaciones.precio_total,
				estado_id: cotizaciones.estado_id,
				estado_nombre: estados.nombre,
				estado_color: estados.color,
				estado_slug: estados.slug,
				asignado_nombre: empleados.nombre,
				asignado_apellido: empleados.apellido
			})
			.from(cotizaciones)
			.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
			.leftJoin(estados, eq(cotizaciones.estado_id, estados.id))
			.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
			.where(where)
			.orderBy(desc(cotizaciones.id))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({ count: count() })
			.from(cotizaciones)
			.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
			.where(where);

		const veImportes = await puedeVerImportes(user);
		return {
			data: veImportes ? data : data.map((cotizacion) => ocultar(cotizacion, ['precio_total'])),
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getCotizacionById = query(v.number(), async (id) => {
	const user = await requirePermission('cotizaciones', 'view');
	const veImportes = await puedeVerImportes(user);
	const [cotizacion] = await db
		.select({
			id: cotizaciones.id,
			numero_cotizacion: cotizaciones.numero_cotizacion,
			canal: cotizaciones.canal,
			descripcion: cotizaciones.descripcion,
			observaciones: cotizaciones.observaciones,
			precio_total: cotizaciones.precio_total,
			descuento_global_porcentaje: cotizaciones.descuento_global_porcentaje,
			incluir_iva: cotizaciones.incluir_iva,
			condiciones_pago: cotizaciones.condiciones_pago,
			validez_dias: cotizaciones.validez_dias,
			fecha_envio: cotizaciones.fecha_envio,
			created_at: cotizaciones.created_at,
			pedido_id: cotizaciones.pedido_id,
			cliente: {
				id: contactos.id,
				nombre: contactos.nombre,
				apellido: contactos.apellido,
				razon_social: contactos.razon_social,
				telefono: contactos.telefono,
				email: contactos.email
			},
			estado: {
				id: cotizaciones.estado_id,
				nombre: estados.nombre,
				color: estados.color,
				slug: estados.slug
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
		.leftJoin(estados, eq(cotizaciones.estado_id, estados.id))
		.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
		.leftJoin(usuarios, eq(cotizaciones.creada_por, usuarios.id))
		.where(eq(cotizaciones.id, id))
		.limit(1);

	if (!cotizacion) error(404, 'Cotización no encontrada');

	const [transiciones, lineasRaw, ordenes] = await Promise.all([
		transicionesDesde(cotizacion.estado.id),
		db
			.select({
				id: lineas_cotizacion.id,
				producto_id: lineas_cotizacion.producto_id,
				insumo_id: lineas_cotizacion.insumo_id,
				insumo_unidad: insumos.unidad,
				visible_cliente: lineas_cotizacion.visible_cliente,
				descripcion: lineas_cotizacion.descripcion,
				cantidad: lineas_cotizacion.cantidad,
				precio_unitario: lineas_cotizacion.precio_unitario,
				precio_lista_unitario: lineas_cotizacion.precio_lista_unitario,
				costo_materiales: lineas_cotizacion.costo_materiales,
				insumos_snapshot: lineas_cotizacion.insumos_snapshot
			})
			.from(lineas_cotizacion)
			.leftJoin(insumos, eq(lineas_cotizacion.insumo_id, insumos.id))
			.where(eq(lineas_cotizacion.cotizacion_id, id))
			.orderBy(lineas_cotizacion.orden_linea),
		cotizacion.pedido_id
			? db
					.select({ id: ordenes_fabricacion.id })
					.from(ordenes_fabricacion)
					.innerJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
					.where(eq(lineas_pedido.pedido_id, cotizacion.pedido_id))
					.orderBy(ordenes_fabricacion.id)
			: Promise.resolve([])
	]);
	const adjuntos = await listarAdjuntosRelacionados({
		cotizacionId: id,
		pedidoId: cotizacion.pedido_id,
		ordenIds: ordenes.map((orden) => orden.id)
	});

	const lineas = lineasRaw.map((fila) => {
		const linea = { ...fila, insumos_snapshot: fila.insumos_snapshot as MaterialSnapshot[] | null };
		return veImportes
			? linea
			: ocultar(linea, [
					'precio_unitario',
					'precio_lista_unitario',
					'costo_materiales',
					'insumos_snapshot'
				]);
	});

	return {
		cotizacion: {
			...(veImportes
				? cotizacion
				: ocultar(cotizacion, ['precio_total', 'descuento_global_porcentaje'])),
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
	return listarEstados('cotizacion');
});

export const getHistorialCotizacion = query(v.number(), async (cotizacionId) => {
	await requirePermission('cotizaciones', 'view');
	return historialEstados('cotizacion', [cotizacionId]);
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
