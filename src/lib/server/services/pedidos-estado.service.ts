import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { logs_cambios_estado, transiciones_estado } from '$lib/server/db/schema';

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;

export type TipoEntidadPedidoEstado = 'pedido';

export const obtenerTransicionPedidoPermitida = async ({
	estadoOrigenId,
	estadoDestinoId
}: {
	estadoOrigenId: number;
	estadoDestinoId: number;
}) => {
	const [transicion] = await db
		.select()
		.from(transiciones_estado)
		.where(
			and(
				eq(transiciones_estado.tipo, 'pedido'),
				eq(transiciones_estado.estado_origen_id, estadoOrigenId),
				eq(transiciones_estado.estado_destino_id, estadoDestinoId)
			)
		)
		.limit(1);

	return transicion;
};

export const registrarCambioPedidoEstado = async ({
	tx,
	entidadId,
	usuarioId,
	estadoAnteriorId,
	estadoNuevoId,
	comentario,
	createdAt
}: {
	tx: Tx;
	entidadId: number;
	usuarioId: number;
	estadoAnteriorId: number;
	estadoNuevoId: number;
	comentario?: string | null;
	createdAt: Date;
}) => {
	await tx.insert(logs_cambios_estado).values({
		entidad_tipo: 'pedido',
		entidad_id: entidadId,
		usuario_id: usuarioId,
		estado_anterior_id: estadoAnteriorId,
		estado_nuevo_id: estadoNuevoId,
		comentario: comentario ?? null,
		created_at: createdAt
	});
};

export const aplicarCambioPedidoEstado = async ({
	tx,
	entidadId,
	usuarioId,
	estadoAnteriorId,
	estadoNuevoId,
	comentario,
	createdAt,
	actualizarEntidad,
	onEstadoDestino
}: {
	tx: Tx;
	entidadId: number;
	usuarioId: number;
	estadoAnteriorId: number;
	estadoNuevoId: number;
	comentario?: string | null;
	createdAt: Date;
	actualizarEntidad: (tx: Tx) => Promise<void> | void;
	onEstadoDestino?: (tx: Tx, estadoId: number) => Promise<void> | void;
}) => {
	await actualizarEntidad(tx);
	await registrarCambioPedidoEstado({
		tx,
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
