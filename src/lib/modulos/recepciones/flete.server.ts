import { error } from '@sveltejs/kit';
import { and, eq, max } from 'drizzle-orm';
import type { Tx } from '$lib/server/db';
import {
	cotizaciones,
	estados,
	lineas_cotizacion,
	lineas_pedido,
	pedidos
} from '$lib/server/db/schema';
import { dolarBNA } from '$lib/modulos/ventas/moneda.server';
import { formatearMoneda, redondearPrecio } from '$lib/utils/precios';
import type { Moneda } from '$lib/utils/moneda';

export const DESCRIPCION_FLETE = 'Flete pagado al recibir la pieza';

export type DocumentoFlete = { tipo: 'cotizacion' | 'pedido'; id: number };

type Documento = DocumentoFlete & {
	numero: string;
	moneda: Moneda;
	tipo_cambio: number | null;
	es_final: boolean;
};

async function documentoDestino(tx: Tx, origen: DocumentoFlete): Promise<Documento> {
	let pedidoId = origen.tipo === 'pedido' ? origen.id : null;
	if (origen.tipo === 'cotizacion') {
		const [cotizacion] = await tx
			.select({
				numero: cotizaciones.numero_cotizacion,
				pedido_id: cotizaciones.pedido_id,
				moneda: cotizaciones.moneda,
				tipo_cambio: cotizaciones.tipo_cambio,
				es_final: estados.es_final
			})
			.from(cotizaciones)
			.innerJoin(estados, eq(estados.id, cotizaciones.estado_id))
			.where(eq(cotizaciones.id, origen.id));
		if (!cotizacion) error(404, 'Cotización no encontrada');
		if (!cotizacion.pedido_id) {
			return { ...origen, ...cotizacion, es_final: Boolean(cotizacion.es_final) };
		}
		pedidoId = cotizacion.pedido_id;
	}
	const [pedido] = await tx
		.select({
			numero: pedidos.numero_pedido,
			moneda: pedidos.moneda,
			tipo_cambio: pedidos.tipo_cambio,
			es_final: estados.es_final
		})
		.from(pedidos)
		.innerJoin(estados, eq(estados.id, pedidos.estado_id))
		.where(eq(pedidos.id, pedidoId!))
		.for('update', { of: pedidos });
	if (!pedido) error(404, 'Pedido no encontrado');
	return { tipo: 'pedido', id: pedidoId!, ...pedido, es_final: Boolean(pedido.es_final) };
}

async function precioEnMoneda(documento: Documento, pesos: number) {
	if (documento.moneda === 'ARS') return { precio: redondearPrecio(pesos), detalle: '' };
	const cambio =
		documento.tipo_cambio && documento.tipo_cambio > 0
			? documento.tipo_cambio
			: ((await dolarBNA())?.venta ?? null);
	if (!cambio) error(400, 'No se pudo obtener el dólar BNA para pasar el flete a dólares');
	return {
		precio: redondearPrecio(pesos / cambio),
		detalle: ` (${formatearMoneda(pesos, 'ARS')})`
	};
}

function tablaLineas(tipo: DocumentoFlete['tipo']) {
	return tipo === 'pedido'
		? { tabla: lineas_pedido, dueno: lineas_pedido.pedido_id }
		: { tabla: lineas_cotizacion, dueno: lineas_cotizacion.cotizacion_id };
}

export async function aplicarFleteRecepcion(tx: Tx, origen: DocumentoFlete, pesos: number | null) {
	const documento = await documentoDestino(tx, origen);
	const { tabla, dueno } = tablaLineas(documento.tipo);
	const [existente] = await tx
		.select({ id: tabla.id, precio: tabla.precio_unitario, cantidad: tabla.cantidad })
		.from(tabla)
		.where(and(eq(dueno, documento.id), eq(tabla.es_flete_recepcion, true)))
		.limit(1);
	const anterior = existente ? redondearPrecio(existente.precio * existente.cantidad) : 0;
	const { precio, detalle } = pesos
		? await precioEnMoneda(documento, pesos)
		: { precio: 0, detalle: '' };
	const diferencia = redondearPrecio(precio - anterior);
	if (!existente && !precio) return null;
	if (existente && diferencia === 0) return null;
	if (documento.es_final) {
		error(
			409,
			`${documento.tipo === 'pedido' ? 'El pedido' : 'La cotización'} ${documento.numero} ya está cerrado: cargá el flete a mano`
		);
	}

	const descripcion = `${DESCRIPCION_FLETE}${detalle}`;
	if (existente && precio) {
		if (documento.tipo === 'pedido') {
			await tx
				.update(lineas_pedido)
				.set({
					cantidad: 1,
					precio_unitario: precio,
					precio_lista_unitario: precio,
					descripcion_personalizada: descripcion
				})
				.where(eq(lineas_pedido.id, existente.id));
		} else {
			await tx
				.update(lineas_cotizacion)
				.set({ cantidad: 1, precio_unitario: precio, precio_lista_unitario: precio, descripcion })
				.where(eq(lineas_cotizacion.id, existente.id));
		}
	} else if (existente) {
		await tx.delete(tabla).where(eq(tabla.id, existente.id));
	} else {
		const [{ ultima }] = await tx
			.select({ ultima: max(tabla.orden_linea) })
			.from(tabla)
			.where(eq(dueno, documento.id));
		const comun = {
			es_personalizado: true,
			es_flete_recepcion: true,
			cantidad: 1,
			precio_unitario: precio,
			precio_lista_unitario: precio,
			orden_linea: (ultima ?? -1) + 1
		};
		if (documento.tipo === 'pedido') {
			await tx.insert(lineas_pedido).values({
				...comun,
				pedido_id: documento.id,
				descripcion_personalizada: descripcion
			});
		} else {
			await tx.insert(lineas_cotizacion).values({
				...comun,
				cotizacion_id: documento.id,
				descripcion
			});
		}
	}

	const total = documento.tipo === 'pedido' ? pedidos : cotizaciones;
	const [actualizado] = await tx
		.select({ precio_total: total.precio_total })
		.from(total)
		.where(eq(total.id, documento.id));
	await tx
		.update(total)
		.set({ precio_total: redondearPrecio((actualizado?.precio_total ?? 0) + diferencia) })
		.where(eq(total.id, documento.id));

	const nombre = `${documento.tipo === 'pedido' ? 'pedido' : 'cotización'} ${documento.numero}`;
	return {
		documento,
		aviso: precio ? `El flete se sumó como ítem al ${nombre}` : `Se quitó el flete del ${nombre}`,
		detalle: precio
			? `Flete pagado al recibir: ${formatearMoneda(precio, documento.moneda)}${detalle}`
			: 'Flete pagado al recibir quitado'
	};
}
