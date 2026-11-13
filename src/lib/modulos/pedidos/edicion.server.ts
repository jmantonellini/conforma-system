import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db, type Tx } from '$lib/server/db';
import {
	estados,
	lineas_pedido,
	ordenes_fabricacion,
	pedido_insumos,
	pedidos,
	reservas_stock
} from '$lib/server/db/schema';
import { registrarAuditoria } from '$lib/server/auditoria';
import {
	resolverLineaComercial,
	type LineaComercialEntrada
} from '$lib/modulos/ventas/lineas.server';
import { factorDesdeUsd } from '$lib/utils/moneda';
import { formatearMoneda, redondearPrecio } from '$lib/utils/precios';
import { LineaPedidoSchema } from './pedidos.server';

export const EdicionPedidoSchema = v.object({
	pedido_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
	precio_total: v.pipe(v.number(), v.minValue(0)),
	anticipo: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
	fecha_entrega_prometida: v.optional(v.nullable(v.string())),
	observaciones: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(2000)))),
	lineas: v.pipe(
		v.array(v.object({ ...LineaPedidoSchema.entries, ref: v.optional(v.string()) })),
		v.minLength(1, 'El pedido necesita al menos un concepto')
	)
});

export type EdicionPedido = v.InferOutput<typeof EdicionPedidoSchema>;
type LineaEditada = EdicionPedido['lineas'][number];

export const MOTIVO_LINEA_FIJA = {
	orden: 'Tiene orden de fabricación: solo se pueden editar precio y descripción',
	reserva: 'Tiene stock reservado: solo se pueden editar precio y descripción'
} as const;

export async function bloqueosLineasPedido(pedidoId: number, ejecutor: Tx | typeof db = db) {
	const [conOrden, conReserva] = await Promise.all([
		ejecutor
			.select({ id: lineas_pedido.id })
			.from(lineas_pedido)
			.innerJoin(ordenes_fabricacion, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
			.where(eq(lineas_pedido.pedido_id, pedidoId)),
		ejecutor
			.select({ id: lineas_pedido.id })
			.from(lineas_pedido)
			.innerJoin(reservas_stock, eq(reservas_stock.linea_pedido_id, lineas_pedido.id))
			.where(and(eq(lineas_pedido.pedido_id, pedidoId), ne(reservas_stock.estado, 'liberada')))
	]);
	const bloqueos = new Map<number, string>();
	for (const { id } of conReserva) bloqueos.set(id, MOTIVO_LINEA_FIJA.reserva);
	for (const { id } of conOrden) bloqueos.set(id, MOTIVO_LINEA_FIJA.orden);
	return bloqueos;
}

const referencia = (ref: string | undefined) => {
	const [tipo, id] = (ref ?? '').split(':');
	const numero = Number(id);
	if ((tipo === 'linea' || tipo === 'insumo') && Number.isSafeInteger(numero) && numero > 0) {
		return { tipo, id: numero } as const;
	}
	return null;
};

const precioCliente = (linea: { visible_cliente: boolean; precio_unitario: number }) =>
	linea.visible_cliente ? linea.precio_unitario : 0;

function entradaComercial(linea: LineaEditada): LineaComercialEntrada {
	return {
		...(linea as LineaComercialEntrada),
		precio_unitario: linea.precio_lista ?? linea.precio,
		precio_lista_unitario: linea.precio_lista ?? linea.precio
	};
}

async function bloquearPedidoEditable(tx: Tx, pedidoId: number) {
	const [pedido] = await tx
		.select({
			id: pedidos.id,
			moneda: pedidos.moneda,
			tipo_cambio: pedidos.tipo_cambio,
			precio_total: pedidos.precio_total,
			anticipo: pedidos.anticipo,
			observaciones: pedidos.observaciones,
			fecha_entrega_prometida: pedidos.fecha_entrega_prometida,
			porcentaje_comision: pedidos.porcentaje_comision_distribuidor,
			monto_credito: pedidos.monto_credito_distribuidor,
			numero: pedidos.numero_pedido,
			es_final: estados.es_final
		})
		.from(pedidos)
		.innerJoin(estados, eq(estados.id, pedidos.estado_id))
		.where(eq(pedidos.id, pedidoId))
		.for('update', { of: pedidos })
		.limit(1);
	if (!pedido) error(404, 'Pedido no encontrado');
	if (pedido.es_final) error(409, 'No se puede editar un pedido finalizado');
	return pedido;
}

export async function editarPedidoServicio(data: EdicionPedido, usuarioId: number) {
	await db.transaction(async (tx) => {
		const pedido = await bloquearPedidoEditable(tx, data.pedido_id);
		const factor = factorDesdeUsd(pedido);
		const bloqueos = await bloqueosLineasPedido(pedido.id, tx);
		const [existentes, insumosExistentes] = await Promise.all([
			tx.select().from(lineas_pedido).where(eq(lineas_pedido.pedido_id, pedido.id)),
			tx.select().from(pedido_insumos).where(eq(pedido_insumos.pedido_id, pedido.id))
		]);
		const lineaPorId = new Map(existentes.map((linea) => [linea.id, linea]));
		const insumoPorId = new Map(insumosExistentes.map((insumo) => [insumo.id, insumo]));
		const conservadas = new Set<number>();
		const insumosConservados = new Set<number>();
		const cambios = { modificadas: 0, agregadas: 0, quitadas: 0 };

		for (const [orden_linea, linea] of data.lineas.entries()) {
			const ref = referencia(linea.ref);

			if (ref?.tipo === 'linea') {
				const actual = lineaPorId.get(ref.id);
				if (!actual) error(400, 'Una de las líneas ya no pertenece al pedido');
				conservadas.add(actual.id);
				const bloqueo = bloqueos.get(actual.id);
				const mismoProducto = String(actual.producto_id ?? '') === String(linea.producto_id ?? '');
				const descripcion = linea.descripcion?.trim() || null;
				if (bloqueo && (!mismoProducto || actual.cantidad !== linea.cantidad)) {
					error(409, `${descripcion ?? 'Una línea'}: ${bloqueo.toLowerCase()}`);
				}

				const cambiaComposicion =
					!bloqueo && (linea.tipo === 'concepto' || (linea.insumos_asociados?.length ?? 0) > 0);
				if (!mismoProducto || cambiaComposicion) {
					const resuelta = await resolverLineaComercial(tx, entradaComercial(linea), 'PED', factor);
					if (resuelta.tipo === 'insumo') {
						error(400, 'Para cambiar una línea por un insumo, quitala y agregá el insumo');
					}
					await tx
						.update(lineas_pedido)
						.set({
							producto_id: resuelta.producto_id,
							cantidad: resuelta.cantidad,
							precio_unitario: precioCliente(resuelta),
							precio_lista_unitario: resuelta.precio_lista_unitario,
							margen_porcentaje: resuelta.margen_producto,
							costo_materiales: resuelta.costo_materiales,
							insumos_snapshot: resuelta.insumos_snapshot,
							es_personalizado: resuelta.es_personalizado,
							descripcion_personalizada: resuelta.es_personalizado ? resuelta.descripcion : null,
							orden_linea
						})
						.where(eq(lineas_pedido.id, actual.id));
				} else {
					const precio = redondearPrecio(linea.precio_lista ?? linea.precio ?? 0);
					await tx
						.update(lineas_pedido)
						.set({
							cantidad: linea.cantidad,
							precio_unitario: linea.visible_cliente ? precio : 0,
							precio_lista_unitario: precio,
							descripcion_personalizada: actual.es_personalizado
								? (descripcion ?? actual.descripcion_personalizada)
								: actual.descripcion_personalizada,
							orden_linea
						})
						.where(eq(lineas_pedido.id, actual.id));
				}
				cambios.modificadas += 1;
				continue;
			}

			if (ref?.tipo === 'insumo') {
				const actual = insumoPorId.get(ref.id);
				if (!actual) error(400, 'Uno de los insumos ya no pertenece al pedido');
				insumosConservados.add(actual.id);
				const resuelta = await resolverLineaComercial(tx, entradaComercial(linea), 'PED', factor);
				if (resuelta.tipo !== 'insumo' || !resuelta.insumo_id) {
					error(400, 'Para cambiar un insumo por un producto, quitalo y agregá el producto');
				}
				await tx
					.update(pedido_insumos)
					.set({
						insumo_id: resuelta.insumo_id,
						cantidad: resuelta.cantidad,
						unidad: resuelta.insumos_snapshot[0]?.unidad ?? actual.unidad,
						costo_unitario: resuelta.costo_materiales,
						precio_lista_unitario: resuelta.precio_lista_unitario,
						precio_unitario: precioCliente(resuelta)
					})
					.where(eq(pedido_insumos.id, actual.id));
				cambios.modificadas += 1;
				continue;
			}

			const resuelta = await resolverLineaComercial(tx, entradaComercial(linea), 'PED', factor);
			if (resuelta.tipo === 'insumo') {
				await tx.insert(pedido_insumos).values({
					pedido_id: pedido.id,
					insumo_id: resuelta.insumo_id!,
					cantidad: resuelta.cantidad,
					unidad: resuelta.insumos_snapshot[0]?.unidad ?? 'unidad',
					costo_unitario: resuelta.costo_materiales,
					precio_lista_unitario: resuelta.precio_lista_unitario,
					precio_unitario: precioCliente(resuelta),
					observaciones: `Insumo agregado al editar el pedido ${pedido.numero}`
				});
			} else {
				await tx.insert(lineas_pedido).values({
					pedido_id: pedido.id,
					producto_id: resuelta.producto_id,
					cantidad: resuelta.cantidad,
					precio_unitario: precioCliente(resuelta),
					precio_lista_unitario: resuelta.precio_lista_unitario,
					margen_porcentaje: resuelta.margen_producto,
					costo_materiales: resuelta.costo_materiales,
					insumos_snapshot: resuelta.insumos_snapshot,
					es_personalizado: resuelta.es_personalizado,
					descripcion_personalizada: resuelta.es_personalizado ? resuelta.descripcion : null,
					orden_linea
				});
			}
			cambios.agregadas += 1;
		}

		const quitadas = existentes.filter((linea) => !conservadas.has(linea.id));
		const bloqueada = quitadas.find((linea) => bloqueos.has(linea.id));
		if (bloqueada) {
			error(409, `No se puede quitar una línea fija: ${bloqueos.get(bloqueada.id)!.toLowerCase()}`);
		}
		if (quitadas.length) {
			await tx.delete(lineas_pedido).where(
				inArray(
					lineas_pedido.id,
					quitadas.map((linea) => linea.id)
				)
			);
		}
		const insumosQuitados = insumosExistentes.filter(
			(insumo) => !insumosConservados.has(insumo.id)
		);
		if (insumosQuitados.length) {
			await tx.delete(pedido_insumos).where(
				inArray(
					pedido_insumos.id,
					insumosQuitados.map((insumo) => insumo.id)
				)
			);
		}
		cambios.quitadas = quitadas.length + insumosQuitados.length;

		const total = redondearPrecio(data.precio_total);
		const anticipo = redondearPrecio(data.anticipo ?? 0);
		const observaciones = data.observaciones?.trim() || null;
		const entrega = data.fecha_entrega_prometida ? new Date(data.fecha_entrega_prometida) : null;
		await tx
			.update(pedidos)
			.set({
				precio_total: total,
				anticipo,
				observaciones,
				fecha_entrega_prometida: entrega,
				monto_credito_distribuidor: Math.min(pedido.monto_credito ?? 0, total),
				monto_comision_distribuidor: redondearPrecio(
					total * ((pedido.porcentaje_comision ?? 0) / 100)
				)
			})
			.where(eq(pedidos.id, pedido.id));

		const detalle = [
			total !== pedido.precio_total &&
				`Total: ${formatearMoneda(pedido.precio_total, pedido.moneda)} → ${formatearMoneda(total, pedido.moneda)}`,
			anticipo !== (pedido.anticipo ?? 0) &&
				`Anticipo: ${formatearMoneda(anticipo, pedido.moneda)}`,
			cambios.agregadas && `${cambios.agregadas} línea(s) agregada(s)`,
			cambios.quitadas && `${cambios.quitadas} línea(s) quitada(s)`,
			observaciones !== (pedido.observaciones ?? null) && 'Observaciones actualizadas',
			entrega?.getTime() !== pedido.fecha_entrega_prometida?.getTime() &&
				'Fecha de entrega actualizada'
		].filter(Boolean);
		await registrarAuditoria(tx, {
			entidad: 'pedido',
			entidadId: pedido.id,
			usuarioId,
			accion: 'edicion',
			detalle: detalle.length ? detalle.join(' · ') : 'Líneas revisadas sin cambios de importes'
		});
	});
}
