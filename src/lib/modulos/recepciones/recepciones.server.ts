import { eq, or, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { empleados, recepciones_pieza, usuarios } from '$lib/server/db/schema';

export type DuenoRecepcion = { cotizacionId?: number | null; pedidoId?: number | null };

export async function buscarRecepcion({ cotizacionId, pedidoId }: DuenoRecepcion) {
	const condiciones = [
		cotizacionId && eq(recepciones_pieza.cotizacion_id, cotizacionId),
		pedidoId && eq(recepciones_pieza.pedido_id, pedidoId)
	].filter((condicion): condicion is SQL => Boolean(condicion));
	if (!condiciones.length) return null;
	const [recepcion] = await db
		.select({
			id: recepciones_pieza.id,
			cotizacion_id: recepciones_pieza.cotizacion_id,
			pedido_id: recepciones_pieza.pedido_id,
			fecha_recepcion: recepciones_pieza.fecha_recepcion,
			llego_por: recepciones_pieza.llego_por,
			numero_guia: recepciones_pieza.numero_guia,
			estado_pieza: recepciones_pieza.estado_pieza,
			recibido_por: empleados.nombre,
			usuario: usuarios.username
		})
		.from(recepciones_pieza)
		.leftJoin(usuarios, eq(usuarios.id, recepciones_pieza.recibido_por))
		.leftJoin(empleados, eq(empleados.id, usuarios.empleado_id))
		.where(or(...condiciones))
		.limit(1);
	if (!recepcion) return null;
	const { usuario, ...datos } = recepcion;
	return { ...datos, recibido_por: datos.recibido_por ?? usuario };
}
