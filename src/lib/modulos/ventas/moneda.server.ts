import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { Tx } from '$lib/server/db';
import {
	cotizaciones,
	estados,
	lineas_cotizacion,
	lineas_pedido,
	pagos,
	pedido_insumos,
	pedidos
} from '$lib/server/db/schema';
import { obtenerCotizacionDolarBNA } from '$lib/server/integraciones/tipo-cambio-bna';
import { registrarAuditoria } from '$lib/server/auditoria';
import { NOMBRE_MONEDA, SIMBOLO_MONEDA, type Moneda } from '$lib/utils/moneda';
import { formatearDosDecimales, redondearPrecio } from '$lib/utils/precios';
import type { MaterialSnapshot } from './tipos';

export async function dolarBNA() {
	try {
		return await obtenerCotizacionDolarBNA();
	} catch (causa) {
		console.warn('[bna] Cotización no disponible', causa);
		return null;
	}
}

export async function monedaParaDocumento(moneda: Moneda, tipoCambio?: number | null) {
	const tipo_cambio =
		tipoCambio && tipoCambio > 0 ? tipoCambio : ((await dolarBNA())?.venta ?? null);
	if (moneda === 'ARS' && !tipo_cambio) {
		error(400, 'No se pudo obtener el dólar BNA. Ingresá el tipo de cambio manualmente.');
	}
	return { moneda, tipo_cambio };
}

export type CambioMoneda = {
	documento: 'cotizacion' | 'pedido';
	id: number;
	moneda: Moneda;
	modo: 'convertir' | 'corregir';
	tipo_cambio: number;
};

const escalar = (columna: unknown, factor: number) =>
	sql`round(${columna} * ${factor}::numeric, 2)`;

function escalarSnapshot(snapshot: unknown, factor: number) {
	if (!Array.isArray(snapshot)) return snapshot;
	return (snapshot as MaterialSnapshot[]).map((material) => ({
		...material,
		...(material.costo_unitario !== undefined && {
			costo_unitario: redondearPrecio(material.costo_unitario * factor)
		}),
		...(material.subtotal !== undefined && {
			subtotal: redondearPrecio(material.subtotal * factor)
		})
	}));
}

async function escalarLineas(
	tx: Tx,
	tabla: typeof lineas_cotizacion | typeof lineas_pedido,
	filtro: ReturnType<typeof eq>,
	factor: number
) {
	const filas = await tx
		.select({ id: tabla.id, insumos_snapshot: tabla.insumos_snapshot })
		.from(tabla)
		.where(filtro);
	for (const fila of filas) {
		await tx
			.update(tabla)
			.set({
				precio_unitario: escalar(tabla.precio_unitario, factor),
				precio_lista_unitario: escalar(tabla.precio_lista_unitario, factor),
				costo_materiales: escalar(tabla.costo_materiales, factor),
				insumos_snapshot: escalarSnapshot(fila.insumos_snapshot, factor)
			})
			.where(eq(tabla.id, fila.id));
	}
}

function describirCambio(desde: Moneda, cambio: CambioMoneda) {
	const tasa = `1 US$ = ${SIMBOLO_MONEDA.ARS} ${formatearDosDecimales(cambio.tipo_cambio)}`;
	const base = `${NOMBRE_MONEDA[desde]} → ${NOMBRE_MONEDA[cambio.moneda]}`;
	return cambio.modo === 'convertir'
		? `${base}. Importes convertidos (${tasa}).`
		: `${base}. Solo se corrigió la moneda; los importes no cambiaron (${tasa}).`;
}

export async function cambiarMonedaTx(tx: Tx, cambio: CambioMoneda, usuarioId: number) {
	const tabla = cambio.documento === 'cotizacion' ? cotizaciones : pedidos;
	const [actual] = await tx
		.select({
			moneda: tabla.moneda,
			tipo_cambio: tabla.tipo_cambio,
			es_final: estados.es_final,
			...(cambio.documento === 'cotizacion' && { pedido_id: cotizaciones.pedido_id })
		})
		.from(tabla)
		.innerJoin(estados, eq(estados.id, tabla.estado_id))
		.where(eq(tabla.id, cambio.id))
		.for('update', { of: tabla })
		.limit(1);
	if (!actual) error(404, 'Documento no encontrado');
	if (actual.moneda === cambio.moneda && cambio.modo === 'convertir') {
		error(400, `El documento ya está en ${NOMBRE_MONEDA[cambio.moneda].toLowerCase()}`);
	}
	if ('pedido_id' in actual && actual.pedido_id) {
		error(409, 'La cotización ya tiene un pedido: cambiá la moneda desde el pedido');
	}
	if (cambio.documento === 'pedido' && actual.es_final) {
		error(409, 'No se puede cambiar la moneda de un pedido finalizado');
	}

	const factor =
		cambio.modo === 'corregir' || actual.moneda === cambio.moneda
			? 1
			: cambio.moneda === 'ARS'
				? cambio.tipo_cambio
				: 1 / cambio.tipo_cambio;

	if (factor !== 1) {
		if (cambio.documento === 'cotizacion') {
			await escalarLineas(
				tx,
				lineas_cotizacion,
				eq(lineas_cotizacion.cotizacion_id, cambio.id),
				factor
			);
			await tx
				.update(cotizaciones)
				.set({ precio_total: escalar(cotizaciones.precio_total, factor) })
				.where(eq(cotizaciones.id, cambio.id));
		} else {
			await escalarLineas(tx, lineas_pedido, eq(lineas_pedido.pedido_id, cambio.id), factor);
			await tx
				.update(pedido_insumos)
				.set({
					costo_unitario: escalar(pedido_insumos.costo_unitario, factor),
					precio_lista_unitario: escalar(pedido_insumos.precio_lista_unitario, factor),
					precio_unitario: escalar(pedido_insumos.precio_unitario, factor)
				})
				.where(eq(pedido_insumos.pedido_id, cambio.id));
			await tx
				.update(pagos)
				.set({ monto: escalar(pagos.monto, factor) })
				.where(eq(pagos.pedido_id, cambio.id));
			await tx
				.update(pedidos)
				.set({
					precio_total: escalar(pedidos.precio_total, factor),
					anticipo: escalar(pedidos.anticipo, factor),
					monto_credito_distribuidor: escalar(pedidos.monto_credito_distribuidor, factor),
					monto_comision_distribuidor: escalar(pedidos.monto_comision_distribuidor, factor)
				})
				.where(eq(pedidos.id, cambio.id));
		}
	}

	await tx
		.update(tabla)
		.set({ moneda: cambio.moneda, tipo_cambio: cambio.tipo_cambio })
		.where(eq(tabla.id, cambio.id));
	await registrarAuditoria(tx, {
		entidad: cambio.documento,
		entidadId: cambio.id,
		usuarioId,
		accion: 'moneda',
		detalle: describirCambio(actual.moneda, cambio)
	});
}
