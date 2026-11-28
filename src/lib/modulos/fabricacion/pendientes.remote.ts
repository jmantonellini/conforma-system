import { aliasedTable, and, asc, eq, inArray, isNull, not, or, sql } from 'drizzle-orm';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import {
	categorias_competencia,
	contactos,
	empleados,
	estados,
	lineas_pedido,
	marcas,
	modelos,
	ordenes_fabricacion,
	pedidos,
	productos,
	tipos_vehiculo
} from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';
import { formatearAnios } from '$lib/modulos/productos/anios';
import { ETIQUETA_TIPO_PIEZA, type TipoPieza } from '$lib/modulos/productos/tipos';
import type { TipoTrabajo } from '$lib/modulos/ventas/trabajo';
import { estadoDeOrden, resumenOrdenes } from './fabricacion.server';

const PEDIDOS_SIN_EMPEZAR = ['pendiente', 'en_produccion', 'demorado'];
const estadoPedido = aliasedTable(estados, 'estado_pedido');

const columnasComunes = {
	personalizada: lineas_pedido.descripcion_personalizada,
	producto: productos.nombre,
	tipo_pieza: productos.tipo_pieza,
	anio_desde: productos.anio_desde,
	anio_hasta: productos.anio_hasta,
	marca: marcas.nombre,
	modelo: modelos.nombre,
	vehiculo: tipos_vehiculo.nombre,
	competencia: categorias_competencia.nombre,
	pedido_id: pedidos.id,
	pedido_numero: pedidos.numero_pedido,
	fecha_pedido: pedidos.fecha_pedido,
	entrega_prometida: pedidos.fecha_entrega_prometida,
	tipo_trabajo: pedidos.tipo_trabajo,
	estado_pedido: { nombre: estadoPedido.nombre, color: estadoPedido.color },
	cliente: contactos.razon_social
};

type Comunes = {
	personalizada: string | null;
	producto: string | null;
	tipo_pieza: TipoPieza | null;
	anio_desde: number | null;
	anio_hasta: number | null;
	marca: string | null;
	modelo: string | null;
	vehiculo: string | null;
	competencia: string | null;
	pedido_id: number | null;
	pedido_numero: string | null;
	fecha_pedido: Date | null;
	entrega_prometida: Date | null;
	tipo_trabajo: TipoTrabajo | null;
	estado_pedido: { nombre: string | null; color: string | null } | null;
	cliente: string | null;
};

const detalleProducto = (fila: Comunes) =>
	[
		fila.tipo_pieza ? ETIQUETA_TIPO_PIEZA[fila.tipo_pieza] : null,
		[fila.marca, fila.modelo].filter(Boolean).join(' ') || null,
		formatearAnios(fila.anio_desde, fila.anio_hasta) || null,
		fila.competencia,
		fila.vehiculo && !fila.marca ? fila.vehiculo : null
	]
		.filter(Boolean)
		.join(' · ');

async function ordenesSinTerminar() {
	const resumen = resumenOrdenes();
	const { estadoOrden, condicion } = estadoDeOrden(resumen);
	return db
		.select({
			...columnasComunes,
			id: ordenes_fabricacion.id,
			nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
			cantidad: ordenes_fabricacion.cantidad_total,
			terminadas: sql<number>`coalesce(${resumen.terminadas}, 0)`,
			prioridad: ordenes_fabricacion.prioridad,
			fecha_estimada: ordenes_fabricacion.fecha_fin_estimada,
			observaciones: ordenes_fabricacion.observaciones,
			estado: { nombre: estadoOrden.nombre, color: estadoOrden.color },
			responsable: sql<
				string | null
			>`nullif(concat_ws(' ', ${empleados.nombre}, ${empleados.apellido}), '')`
		})
		.from(ordenes_fabricacion)
		.leftJoin(resumen, eq(resumen.orden_id, ordenes_fabricacion.id))
		.leftJoin(estadoOrden, condicion)
		.leftJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.leftJoin(pedidos, eq(pedidos.id, lineas_pedido.pedido_id))
		.leftJoin(estadoPedido, eq(estadoPedido.id, pedidos.estado_id))
		.leftJoin(contactos, eq(contactos.id, pedidos.contacto_id))
		.leftJoin(
			productos,
			eq(
				productos.id,
				sql`coalesce(${lineas_pedido.producto_id}, ${ordenes_fabricacion.producto_id})`
			)
		)
		.leftJoin(marcas, eq(marcas.id, productos.marca_id))
		.leftJoin(modelos, eq(modelos.id, productos.modelo_id))
		.leftJoin(tipos_vehiculo, eq(tipos_vehiculo.id, productos.tipo_vehiculo_id))
		.leftJoin(
			categorias_competencia,
			eq(categorias_competencia.id, productos.categoria_competencia_id)
		)
		.leftJoin(empleados, eq(empleados.id, ordenes_fabricacion.asignado_a))
		.where(or(isNull(estadoOrden.id), eq(estadoOrden.es_final, false)))
		.orderBy(asc(ordenes_fabricacion.id));
}

async function lineasSinOrden() {
	return db
		.select({
			...columnasComunes,
			linea_id: lineas_pedido.id,
			cantidad: lineas_pedido.cantidad
		})
		.from(lineas_pedido)
		.innerJoin(pedidos, eq(pedidos.id, lineas_pedido.pedido_id))
		.innerJoin(estadoPedido, eq(estadoPedido.id, pedidos.estado_id))
		.leftJoin(contactos, eq(contactos.id, pedidos.contacto_id))
		.leftJoin(productos, eq(productos.id, lineas_pedido.producto_id))
		.leftJoin(marcas, eq(marcas.id, productos.marca_id))
		.leftJoin(modelos, eq(modelos.id, productos.modelo_id))
		.leftJoin(tipos_vehiculo, eq(tipos_vehiculo.id, productos.tipo_vehiculo_id))
		.leftJoin(
			categorias_competencia,
			eq(categorias_competencia.id, productos.categoria_competencia_id)
		)
		.leftJoin(ordenes_fabricacion, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
		.where(
			and(
				isNull(ordenes_fabricacion.id),
				not(lineas_pedido.es_flete_recepcion),
				eq(pedidos.historico, false),
				inArray(estadoPedido.slug, PEDIDOS_SIN_EMPEZAR)
			)
		)
		.orderBy(asc(lineas_pedido.orden_linea), asc(lineas_pedido.id));
}

export const getTrabajosPendientes = query(async () => {
	await requirePermission('fabricacion', 'view');
	const [ordenes, lineas] = await Promise.all([ordenesSinTerminar(), lineasSinOrden()]);

	const grupos = new Map<string, Grupo>();
	const grupoDe = (fila: Comunes) => {
		const clave = fila.pedido_id ? `pedido-${fila.pedido_id}` : 'stock';
		const grupo = grupos.get(clave) ?? {
			clave,
			pedido: fila.pedido_id
				? {
						id: fila.pedido_id,
						numero: fila.pedido_numero,
						fecha: fila.fecha_pedido,
						entrega: fila.entrega_prometida,
						tipo_trabajo: fila.tipo_trabajo,
						estado: fila.estado_pedido?.nombre ? fila.estado_pedido : null
					}
				: null,
			cliente: fila.cliente,
			trabajos: []
		};
		grupos.set(clave, grupo);
		return grupo;
	};

	for (const fila of ordenes) {
		grupoDe(fila).trabajos.push({
			clave: `orden-${fila.id}`,
			orden: fila.id,
			que: fila.producto ?? fila.personalizada ?? fila.nombre_trabajo,
			detalle: detalleProducto(fila),
			personalizada: fila.producto ? fila.personalizada : null,
			cantidad: fila.cantidad,
			terminadas: fila.terminadas,
			prioridad: fila.prioridad ?? 0,
			estado: fila.estado?.nombre ? fila.estado : null,
			responsable: fila.responsable,
			estimada: fila.fecha_estimada,
			observaciones: fila.observaciones
		});
	}
	for (const fila of lineas) {
		grupoDe(fila).trabajos.push({
			clave: `linea-${fila.linea_id}`,
			orden: null,
			que: fila.producto ?? fila.personalizada ?? 'Producto sin especificar',
			detalle: detalleProducto(fila),
			personalizada: fila.producto ? fila.personalizada : null,
			cantidad: fila.cantidad,
			terminadas: 0,
			prioridad: 0,
			estado: null,
			responsable: null,
			estimada: null,
			observaciones: null
		});
	}

	const limite = (grupo: Grupo) => {
		const fechas = [grupo.pedido?.entrega, ...grupo.trabajos.map((t) => t.estimada)]
			.filter((f): f is Date => f instanceof Date)
			.map((f) => f.getTime());
		return fechas.length ? Math.min(...fechas) : Infinity;
	};
	const urgencia = (grupo: Grupo) => Math.max(...grupo.trabajos.map((t) => t.prioridad));

	return [...grupos.values()].sort(
		(a, b) =>
			Number(!a.pedido) - Number(!b.pedido) ||
			limite(a) - limite(b) ||
			urgencia(b) - urgencia(a) ||
			(a.pedido?.id ?? 0) - (b.pedido?.id ?? 0)
	);
});

type Fecha = Date | null;
type Grupo = {
	clave: string;
	pedido: {
		id: number;
		numero: string | null;
		fecha: Fecha;
		entrega: Fecha;
		tipo_trabajo: TipoTrabajo | null;
		estado: { nombre: string | null; color: string | null } | null;
	} | null;
	cliente: string | null;
	trabajos: {
		clave: string;
		orden: number | null;
		que: string;
		detalle: string;
		personalizada: string | null;
		cantidad: number;
		terminadas: number;
		prioridad: number;
		estado: { nombre: string | null; color: string | null } | null;
		responsable: string | null;
		estimada: Fecha;
		observaciones: string | null;
	}[];
};
