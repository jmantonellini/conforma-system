import { and, desc, eq, inArray, or, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adjuntos } from '$lib/server/db/schema';
import { eliminarObjeto } from '$lib/server/services/object-storage.service';
import { Modulos } from '$lib/types';
import type { Adjunto, TipoEntidadAdjunto } from '$lib/types/adjuntos';

/** Columna de `adjuntos` y módulo de permisos de cada entidad dueña de archivos. */
export const ENTIDADES_ADJUNTO = {
	cotizacion: { columna: adjuntos.cotizacion_id, modulo: Modulos.COTIZACIONES },
	pedido: { columna: adjuntos.pedido_id, modulo: Modulos.PEDIDOS },
	fabricacion: { columna: adjuntos.orden_fabricacion_id, modulo: Modulos.FABRICACION },
	producto: { columna: adjuntos.producto_id, modulo: Modulos.PRODUCTOS }
} as const satisfies Record<TipoEntidadAdjunto, unknown>;

type FilaPropietario = Pick<
	typeof adjuntos.$inferSelect,
	'cotizacion_id' | 'pedido_id' | 'orden_fabricacion_id' | 'producto_id'
>;

export function propietarioAdjunto(fila: FilaPropietario): Adjunto['propietario'] | null {
	if (fila.cotizacion_id) return { tipo: 'cotizacion', id: fila.cotizacion_id };
	if (fila.pedido_id) return { tipo: 'pedido', id: fila.pedido_id };
	if (fila.orden_fabricacion_id) return { tipo: 'fabricacion', id: fila.orden_fabricacion_id };
	if (fila.producto_id) return { tipo: 'producto', id: fila.producto_id };
	return null;
}

/** Adjuntos de toda la cadena comercial (cotización → pedido → órdenes, y planos del producto). */
export async function listarAdjuntosRelacionados(relacion: {
	cotizacionId?: number | null;
	pedidoId?: number | null;
	ordenIds?: number[];
	productoPlanosId?: number | null;
}): Promise<Adjunto[]> {
	const condiciones = [
		relacion.cotizacionId && eq(adjuntos.cotizacion_id, relacion.cotizacionId),
		relacion.pedidoId && eq(adjuntos.pedido_id, relacion.pedidoId),
		relacion.ordenIds?.length && inArray(adjuntos.orden_fabricacion_id, relacion.ordenIds),
		relacion.productoPlanosId &&
			and(eq(adjuntos.producto_id, relacion.productoPlanosId), eq(adjuntos.es_plano, true))
	].filter((condicion): condicion is SQL => Boolean(condicion));
	if (!condiciones.length) return [];

	const filas = await db
		.select()
		.from(adjuntos)
		.where(or(...condiciones))
		.orderBy(desc(adjuntos.created_at), desc(adjuntos.id));

	return filas.map((fila) => ({
		id: fila.id,
		nombre_original: fila.nombre_original,
		mime_type: fila.mime_type,
		es_plano: fila.es_plano,
		tamano_bytes: fila.tamano_bytes,
		created_at: fila.created_at,
		propietario: propietarioAdjunto(fila)!
	}));
}

/** Claves de almacenamiento de los adjuntos de una entidad (leer antes de borrarla: el FK es cascade). */
export async function clavesAdjuntos(tipo: TipoEntidadAdjunto, id: number) {
	const filas = await db
		.select({ clave: adjuntos.archivo_key })
		.from(adjuntos)
		.where(eq(ENTIDADES_ADJUNTO[tipo].columna, id));
	return filas.map((fila) => fila.clave);
}

export const eliminarArchivos = (claves: string[]) =>
	Promise.allSettled(claves.map((clave) => eliminarObjeto(clave)));
