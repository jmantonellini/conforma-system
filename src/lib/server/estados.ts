import { error } from '@sveltejs/kit';
import { aliasedTable, and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, type Tx } from '$lib/server/db';
import {
	empleados,
	estados,
	logs_cambios_estado,
	transiciones_estado,
	usuarios,
	type FlujoEstado
} from '$lib/server/db/schema';

export type { Tx };
export type Ejecutor = typeof db | Tx;

/** Cómo se identifica cada flujo en `logs_cambios_estado.entidad_tipo`. */
const ENTIDAD_LOG = {
	cotizacion: 'cotizacion',
	pedido: 'pedido',
	fabricacion: 'unidad'
} as const satisfies Record<
	FlujoEstado,
	(typeof logs_cambios_estado.entidad_tipo.enumValues)[number]
>;

export const listarEstados = (flujo: FlujoEstado) =>
	db.select().from(estados).where(eq(estados.flujo, flujo)).orderBy(asc(estados.orden));

export async function estadoPorSlug(flujo: FlujoEstado, slug: string, ejecutor: Ejecutor = db) {
	const [estado] = await ejecutor
		.select()
		.from(estados)
		.where(and(eq(estados.flujo, flujo), eq(estados.slug, slug)))
		.limit(1);
	if (!estado) error(500, `Falta configurar el estado "${slug}" (${flujo})`);
	return estado;
}

/** Destinos alcanzables desde un estado, en el formato que consumen las vistas de detalle. */
export const transicionesDesde = (estadoId: number) =>
	db
		.select({
			id: transiciones_estado.id,
			estado_destino_id: transiciones_estado.estado_destino_id,
			destino_nombre: estados.nombre,
			destino_slug: estados.slug,
			destino_color: estados.color
		})
		.from(transiciones_estado)
		.innerJoin(estados, eq(transiciones_estado.estado_destino_id, estados.id))
		.where(eq(transiciones_estado.estado_origen_id, estadoId))
		.orderBy(asc(estados.orden));

export async function transicionPermitida(ejecutor: Ejecutor, origenId: number, destinoId: number) {
	const [transicion] = await ejecutor
		.select({ id: transiciones_estado.id })
		.from(transiciones_estado)
		.where(
			and(
				eq(transiciones_estado.estado_origen_id, origenId),
				eq(transiciones_estado.estado_destino_id, destinoId)
			)
		)
		.limit(1);
	return Boolean(transicion);
}

/** Valida `origen → destino` contra la tabla de transiciones y devuelve el estado destino. */
export async function validarTransicion(ejecutor: Ejecutor, origenId: number, destinoId: number) {
	const origen = aliasedTable(estados, 'origen');
	const [fila] = await ejecutor
		.select({
			destino: {
				id: estados.id,
				flujo: estados.flujo,
				slug: estados.slug,
				nombre: estados.nombre,
				es_final: estados.es_final
			},
			origen: origen.nombre,
			transicion: transiciones_estado.id
		})
		.from(estados)
		.innerJoin(origen, eq(origen.id, origenId))
		.leftJoin(
			transiciones_estado,
			and(
				eq(transiciones_estado.estado_origen_id, origenId),
				eq(transiciones_estado.estado_destino_id, estados.id)
			)
		)
		.where(eq(estados.id, destinoId))
		.limit(1);

	if (!fila?.transicion) {
		error(409, `Transición no permitida: ${fila?.origen ?? '?'} → ${fila?.destino.nombre ?? '?'}`);
	}
	return fila.destino;
}

export function registrarCambioEstado(
	tx: Ejecutor,
	cambio: {
		flujo: FlujoEstado;
		entidadId: number;
		usuarioId: number;
		anteriorId: number | null;
		nuevoId: number;
		comentario?: string | null;
		fecha?: Date;
	}
) {
	return tx.insert(logs_cambios_estado).values({
		entidad_tipo: ENTIDAD_LOG[cambio.flujo],
		entidad_id: cambio.entidadId,
		usuario_id: cambio.usuarioId,
		estado_anterior_id: cambio.anteriorId,
		estado_nuevo_id: cambio.nuevoId,
		comentario: cambio.comentario?.trim() || null,
		created_at: cambio.fecha ?? new Date()
	});
}

/** Historial de cambios de estado de una o varias entidades del flujo, más reciente primero. */
export function historialEstados(flujo: FlujoEstado, entidadIds: number[]) {
	const anterior = aliasedTable(estados, 'estado_anterior');
	const nuevo = aliasedTable(estados, 'estado_nuevo');
	return db
		.select({
			id: logs_cambios_estado.id,
			entidad_id: logs_cambios_estado.entidad_id,
			estado_anterior: { nombre: anterior.nombre, color: anterior.color },
			estado_nuevo: { nombre: nuevo.nombre, color: nuevo.color },
			comentario: logs_cambios_estado.comentario,
			fecha: logs_cambios_estado.created_at,
			empleado: empleados.nombre
		})
		.from(logs_cambios_estado)
		.leftJoin(usuarios, eq(logs_cambios_estado.usuario_id, usuarios.id))
		.leftJoin(empleados, eq(usuarios.empleado_id, empleados.id))
		.leftJoin(anterior, eq(logs_cambios_estado.estado_anterior_id, anterior.id))
		.leftJoin(nuevo, eq(logs_cambios_estado.estado_nuevo_id, nuevo.id))
		.where(
			and(
				eq(logs_cambios_estado.entidad_tipo, ENTIDAD_LOG[flujo]),
				inArray(logs_cambios_estado.entidad_id, entidadIds)
			)
		)
		.orderBy(desc(logs_cambios_estado.created_at));
}
