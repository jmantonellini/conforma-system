import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, type Tx } from '$lib/server/db';
import { empleados, logs_sistema, usuarios } from '$lib/server/db/schema';

export type EntidadAuditada = 'cotizacion' | 'pedido';
export type AccionAuditada = 'edicion' | 'moneda';

export const TITULO_ACCION: Record<AccionAuditada, string> = {
	edicion: 'Datos editados',
	moneda: 'Moneda cambiada'
};

export async function registrarAuditoria(
	tx: Tx,
	registro: {
		entidad: EntidadAuditada;
		entidadId: number;
		usuarioId: number;
		accion: AccionAuditada;
		detalle: string;
	}
) {
	await tx.insert(logs_sistema).values({
		entidad: registro.entidad,
		entidad_id: registro.entidadId,
		usuario_id: registro.usuarioId,
		accion: registro.accion,
		detalles: registro.detalle
	});
}

export async function historialAuditoria(entidad: EntidadAuditada, entidadIds: number[]) {
	if (!entidadIds.length) return [];
	const filas = await db
		.select({
			id: logs_sistema.id,
			entidad_id: logs_sistema.entidad_id,
			accion: logs_sistema.accion,
			detalle: logs_sistema.detalles,
			fecha: logs_sistema.created_at,
			empleado: empleados.nombre,
			usuario: usuarios.username
		})
		.from(logs_sistema)
		.leftJoin(usuarios, eq(logs_sistema.usuario_id, usuarios.id))
		.leftJoin(empleados, eq(usuarios.empleado_id, empleados.id))
		.where(and(eq(logs_sistema.entidad, entidad), inArray(logs_sistema.entidad_id, entidadIds)))
		.orderBy(desc(logs_sistema.created_at));
	return filas.map((fila) => ({
		...fila,
		titulo: TITULO_ACCION[fila.accion as AccionAuditada] ?? 'Cambio registrado',
		empleado: fila.empleado ?? fila.usuario
	}));
}
