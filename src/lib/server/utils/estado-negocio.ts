import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { logs_cambios_estado, transiciones_estado } from '$lib/server/db/schema';

export type TipoEntidadEstado = 'cotizacion' | 'pedido';

export const redondearMoneda = (valor: number) =>
	Number((Math.round((valor + Number.EPSILON) * 100) / 100).toFixed(2));

export const calcularTotalLineas = (
	lineas: Array<{ cantidad?: number; precio?: number; precio_unitario?: number }>
) =>
	redondearMoneda(
		lineas.reduce(
			(suma, linea) =>
				suma + Number(linea.cantidad ?? 0) * Number(linea.precio ?? linea.precio_unitario ?? 0),
			0
		)
	);

export const obtenerTransicionPermitida = async ({
	tipo,
	estadoOrigenId,
	estadoDestinoId
}: {
	tipo: TipoEntidadEstado;
	estadoOrigenId: number;
	estadoDestinoId: number;
}) => {
	const [transicion] = await db
		.select()
		.from(transiciones_estado)
		.where(
			and(
				eq(transiciones_estado.tipo, tipo),
				eq(transiciones_estado.estado_origen_id, estadoOrigenId),
				eq(transiciones_estado.estado_destino_id, estadoDestinoId)
			)
		)
		.limit(1);

	return transicion;
};

export const registrarCambioEstado = async ({
	tx,
	entidadTipo,
	entidadId,
	usuarioId,
	estadoAnteriorId,
	estadoNuevoId,
	comentario,
	createdAt
}: {
	tx: Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;
	entidadTipo: TipoEntidadEstado;
	entidadId: number;
	usuarioId: number;
	estadoAnteriorId: number;
	estadoNuevoId: number;
	comentario?: string | null;
	createdAt: Date;
}) => {
	await tx.insert(logs_cambios_estado).values({
		entidad_tipo: entidadTipo,
		entidad_id: entidadId,
		usuario_id: usuarioId,
		estado_anterior_id: estadoAnteriorId,
		estado_nuevo_id: estadoNuevoId,
		comentario: comentario ?? null,
		created_at: createdAt
	});
};

export const aplicarCambioDeEstado = async ({
	tx,
	entidadTipo,
	entidadId,
	usuarioId,
	estadoAnteriorId,
	estadoNuevoId,
	comentario,
	createdAt,
	actualizarEntidad,
	onEstadoDestino
}: {
	tx: Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;
	entidadTipo: TipoEntidadEstado;
	entidadId: number;
	usuarioId: number;
	estadoAnteriorId: number;
	estadoNuevoId: number;
	comentario?: string | null;
	createdAt: Date;
	actualizarEntidad: (
		tx: Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never
	) => Promise<void> | void;
	onEstadoDestino?: (
		tx: Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never,
		estadoId: number
	) => Promise<void> | void;
}) => {
	await actualizarEntidad(tx);
	await registrarCambioEstado({
		tx,
		entidadTipo,
		entidadId,
		usuarioId,
		estadoAnteriorId,
		estadoNuevoId,
		comentario,
		createdAt
	});

	if (onEstadoDestino) {
		await onEstadoDestino(tx, estadoNuevoId);
	}
};
