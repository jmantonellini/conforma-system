import { secuencial } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import type { Tx } from '$lib/server/db';
import { hayStockSuficiente } from '$lib/modulos/insumos/inventario';
import {
	empleados,
	insumos,
	lineas_pedido,
	movimientos_insumos,
	ordenes_fabricacion,
	producto_componentes,
	producto_insumos
} from '$lib/server/db/schema';
import type { MaterialSnapshot } from '$lib/modulos/ventas/tipos';

export type TipoMovimientoInsumo = 'ingreso' | 'consumo';

export const saldoMovimientos =
	sql<number>`COALESCE(SUM(CASE WHEN ${movimientos_insumos.tipo} IN ('ingreso', 'ajuste_entrada') THEN ${movimientos_insumos.cantidad} ELSE -${movimientos_insumos.cantidad} END), 0)`.mapWith(
		Number
	);

export async function obtenerSaldoInsumoTx(tx: Tx, insumoId: number) {
	const [resultado] = await tx
		.select({
			saldo: saldoMovimientos
		})
		.from(movimientos_insumos)
		.where(eq(movimientos_insumos.insumo_id, insumoId));
	return Number(resultado?.saldo ?? 0);
}

export async function registrarMovimientoInsumoTx(
	tx: Tx,
	movimiento: {
		insumo_id: number;
		tipo: TipoMovimientoInsumo;
		fuente?: 'manual' | 'receta';
		cantidad: number;
		orden_fabricacion_id?: number;
		empleado_id: number;
		usuario_id: number;
		motivo: string;
	}
) {
	const [insumo] = await tx
		.select({ id: insumos.id, codigo: insumos.codigo, activo: insumos.activo })
		.from(insumos)
		.where(eq(insumos.id, movimiento.insumo_id))
		.for('update')
		.limit(1);
	if (!insumo || !insumo.activo) error(404, 'Insumo no encontrado o inactivo');

	if (movimiento.tipo === 'consumo') {
		const saldo = await obtenerSaldoInsumoTx(tx, movimiento.insumo_id);
		if (!hayStockSuficiente(saldo, movimiento.cantidad)) {
			error(
				400,
				`Stock insuficiente para ${insumo.codigo}. Disponible: ${saldo}, solicitado: ${movimiento.cantidad}`
			);
		}
	}

	const insercion = tx.insert(movimientos_insumos).values(movimiento);
	const [registrado] =
		movimiento.fuente === 'receta'
			? await insercion.onConflictDoNothing().returning({ id: movimientos_insumos.id })
			: await insercion.returning({ id: movimientos_insumos.id });
	if (!registrado && movimiento.fuente === 'receta') {
		error(400, 'La receta de esta orden ya fue consumida');
	}
	return registrado;
}

export async function obtenerInsumosRequeridosOrdenTx(tx: Tx, ordenId: number) {
	const [orden] = await tx
		.select({
			cantidad_total: ordenes_fabricacion.cantidad_total,
			producto_id: sql<
				number | null
			>`COALESCE(${lineas_pedido.producto_id}, ${ordenes_fabricacion.producto_id})`,
			insumos_snapshot: lineas_pedido.insumos_snapshot
		})
		.from(ordenes_fabricacion)
		.leftJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(eq(ordenes_fabricacion.id, ordenId))
		.limit(1);
	if (!orden) error(404, 'Orden de fabricación no encontrada');

	const cantidades = new Map<number, number>();
	const acumularProducto = async (
		productoId: number,
		multiplicador: number,
		visitados: Set<number>
	) => {
		if (visitados.has(productoId)) error(400, 'La receta contiene un ciclo de productos');
		const siguientes = new Set(visitados).add(productoId);
		const [materiales, componentes] = await secuencial(
			() =>
				tx
					.select({ insumo_id: producto_insumos.insumo_id, cantidad: producto_insumos.cantidad })
					.from(producto_insumos)
					.where(eq(producto_insumos.producto_id, productoId)),
			() =>
				tx
					.select({
						producto_id: producto_componentes.componente_id,
						cantidad: producto_componentes.cantidad
					})
					.from(producto_componentes)
					.where(eq(producto_componentes.producto_id, productoId))
		);

		for (const material of materiales) {
			cantidades.set(
				material.insumo_id,
				(cantidades.get(material.insumo_id) ?? 0) + material.cantidad * multiplicador
			);
		}
		for (const componente of componentes) {
			await acumularProducto(
				componente.producto_id,
				componente.cantidad * multiplicador,
				siguientes
			);
		}
	};

	const snapshot = Array.isArray(orden.insumos_snapshot)
		? (orden.insumos_snapshot as MaterialSnapshot[])
		: [];
	if (!orden.producto_id && !snapshot.length) {
		error(400, 'Esta orden no tiene una receta de insumos para consumir');
	}
	if (snapshot.length) {
		for (const material of snapshot) {
			if (material.insumo_id) {
				cantidades.set(
					material.insumo_id,
					(cantidades.get(material.insumo_id) ?? 0) + material.cantidad
				);
			} else if (material.producto_id) {
				await acumularProducto(material.producto_id, material.cantidad, new Set());
			}
		}
	} else if (orden.producto_id) {
		await acumularProducto(orden.producto_id, 1, new Set());
	}

	const requeridos = Array.from(cantidades, ([insumo_id, cantidad]) => ({
		insumo_id,
		cantidad: cantidad * orden.cantidad_total
	})).filter((item) => item.cantidad > 0);
	if (!requeridos.length) error(400, 'La receta no tiene insumos para consumir');
	return requeridos.sort((a, b) => a.insumo_id - b.insumo_id);
}

export async function verificarEmpleadoActivo(tx: Tx, empleadoId: number) {
	const [empleado] = await tx
		.select({ id: empleados.id })
		.from(empleados)
		.where(and(eq(empleados.id, empleadoId), eq(empleados.activo, true)))
		.limit(1);
	return empleado;
}
