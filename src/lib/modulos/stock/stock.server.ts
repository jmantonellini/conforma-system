import { error } from '@sveltejs/kit';
import { aliasedTable, and, desc, eq, sql } from 'drizzle-orm';
import { db, type Tx, secuencial } from '$lib/server/db';
import {
	contactos,
	lineas_pedido,
	movimientos_stock,
	productos,
	reservas_stock,
	ubicaciones_stock
} from '$lib/server/db/schema';
import {
	TIPOS_MOVIMIENTO_STOCK,
	UBICACIONES_STOCK,
	type TipoMovimientoStock,
	type TipoUbicacionStock
} from '$lib/modulos/stock/tipos';
import { ETIQUETAS_MOVIMIENTO_STOCK } from '$lib/modulos/stock/tipos';

export async function obtenerUbicacionCentral(tx: Tx) {
	const [ubicacion] = await tx
		.select({ id: ubicaciones_stock.id })
		.from(ubicaciones_stock)
		.where(eq(ubicaciones_stock.tipo, 'deposito'))
		.limit(1);
	if (!ubicacion) error(400, 'No está configurado el depósito central');
	return ubicacion.id;
}

export async function obtenerUbicacionDistribuidor(tx: Tx, contactoId: number) {
	const [contacto] = await tx
		.select({ id: contactos.id, nombre: contactos.razon_social })
		.from(contactos)
		.where(and(eq(contactos.id, contactoId), eq(contactos.es_distribuidor, true)))
		.limit(1);
	if (!contacto) error(400, 'Seleccioná un distribuidor válido');

	const [existente] = await tx
		.select({ id: ubicaciones_stock.id })
		.from(ubicaciones_stock)
		.where(eq(ubicaciones_stock.contacto_distribuidor_id, contactoId))
		.limit(1);
	if (existente) return existente.id;

	await tx
		.insert(ubicaciones_stock)
		.values({
			tipo: 'distribuidor',
			nombre: contacto.nombre,
			contacto_distribuidor_id: contactoId
		})
		.onConflictDoNothing();
	const [ubicacion] = await tx
		.select({ id: ubicaciones_stock.id })
		.from(ubicaciones_stock)
		.where(eq(ubicaciones_stock.contacto_distribuidor_id, contactoId))
		.limit(1);
	if (!ubicacion) error(400, 'No se pudo crear la ubicación del distribuidor');
	return ubicacion.id;
}

export async function obtenerStockDisponibleTx(tx: Tx, productoId: number, ubicacionId: number) {
	const [ubicacion] = await tx
		.select({ id: ubicaciones_stock.id })
		.from(ubicaciones_stock)
		.where(and(eq(ubicaciones_stock.id, ubicacionId), eq(ubicaciones_stock.activo, true)))
		.for('update');
	if (!ubicacion) error(404, 'Ubicación de stock no encontrada');

	const [[saldo], [reservas]] = await secuencial(
		() =>
			tx
				.select({
					entradas: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos_stock.ubicacion_destino_id} = ${ubicacionId} THEN ${movimientos_stock.cantidad} ELSE 0 END), 0)::int`,
					salidas: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos_stock.ubicacion_origen_id} = ${ubicacionId} THEN ${movimientos_stock.cantidad} ELSE 0 END), 0)::int`
				})
				.from(movimientos_stock)
				.where(eq(movimientos_stock.producto_id, productoId)),
		() =>
			tx
				.select({ cantidad: sql<number>`COALESCE(SUM(${reservas_stock.cantidad}), 0)::int` })
				.from(reservas_stock)
				.innerJoin(lineas_pedido, eq(reservas_stock.linea_pedido_id, lineas_pedido.id))
				.where(
					and(
						eq(reservas_stock.ubicacion_stock_id, ubicacionId),
						eq(reservas_stock.estado, 'reservada'),
						eq(lineas_pedido.producto_id, productoId)
					)
				)
	);

	return (
		Number(saldo?.entradas ?? 0) - Number(saldo?.salidas ?? 0) - Number(reservas?.cantidad ?? 0)
	);
}

export async function reservarStockParaLineaTx(
	tx: Tx,
	{
		lineaPedidoId,
		productoId,
		ubicacionId,
		cantidad
	}: {
		lineaPedidoId: number;
		productoId: number;
		ubicacionId: number;
		cantidad: number;
	}
) {
	const disponible = await obtenerStockDisponibleTx(tx, productoId, ubicacionId);
	if (disponible < cantidad) {
		error(400, `Stock insuficiente. Disponible: ${disponible} unidades.`);
	}
	await tx.insert(reservas_stock).values({
		linea_pedido_id: lineaPedidoId,
		ubicacion_stock_id: ubicacionId,
		cantidad,
		estado: 'reservada'
	});
}

export async function procesarReservasPedidoTx(
	tx: Tx,
	pedidoId: number,
	accion: 'consumir' | 'liberar',
	usuarioId: number
) {
	const reservas = await tx
		.select({
			id: reservas_stock.id,
			linea_pedido_id: reservas_stock.linea_pedido_id,
			ubicacion_stock_id: reservas_stock.ubicacion_stock_id,
			ubicacion_tipo: ubicaciones_stock.tipo,
			producto_id: lineas_pedido.producto_id,
			cantidad: reservas_stock.cantidad
		})
		.from(reservas_stock)
		.innerJoin(lineas_pedido, eq(reservas_stock.linea_pedido_id, lineas_pedido.id))
		.innerJoin(ubicaciones_stock, eq(reservas_stock.ubicacion_stock_id, ubicaciones_stock.id))
		.where(and(eq(lineas_pedido.pedido_id, pedidoId), eq(reservas_stock.estado, 'reservada')));

	for (const reserva of reservas) {
		if (accion === 'consumir' && reserva.producto_id) {
			await tx
				.insert(movimientos_stock)
				.values({
					producto_id: reserva.producto_id,
					ubicacion_origen_id: reserva.ubicacion_stock_id,
					cantidad: reserva.cantidad,
					tipo:
						reserva.ubicacion_tipo === UBICACIONES_STOCK.DISTRIBUIDOR
							? 'venta_distribuidor'
							: 'venta_pedido',
					linea_pedido_id: reserva.linea_pedido_id,
					usuario_id: usuarioId
				})
				.onConflictDoNothing();
		}
		await tx
			.update(reservas_stock)
			.set({ estado: accion === 'consumir' ? 'consumida' : 'liberada', updated_at: new Date() })
			.where(eq(reservas_stock.id, reserva.id));
	}
}

export async function registrarIngresoProduccionTx(
	tx: Tx,
	{ productoId, unidadId, usuarioId }: { productoId: number; unidadId: number; usuarioId: number }
) {
	const ubicacionId = await obtenerUbicacionCentral(tx);
	await tx
		.insert(movimientos_stock)
		.values({
			producto_id: productoId,
			ubicacion_destino_id: ubicacionId,
			cantidad: 1,
			tipo: 'produccion',
			unidad_fabricacion_id: unidadId,
			usuario_id: usuarioId
		})
		.onConflictDoNothing();
}

export async function obtenerStockDisponibilidadService() {
	return db.transaction(async (tx) => {
		const origen = aliasedTable(ubicaciones_stock, 'ubicacion_origen');
		const destino = aliasedTable(ubicaciones_stock, 'ubicacion_destino');
		const contactoOrigen = aliasedTable(contactos, 'contacto_origen');
		const contactoDestino = aliasedTable(contactos, 'contacto_destino');
		const [ubicaciones, productosRows, movimientos, reservas, distribuidores, historial] =
			await secuencial(
				() =>
					tx
						.select({
							id: ubicaciones_stock.id,
							tipo: ubicaciones_stock.tipo,
							nombre: ubicaciones_stock.nombre,
							contacto_distribuidor_id: ubicaciones_stock.contacto_distribuidor_id,
							distribuidor: contactos.razon_social
						})
						.from(ubicaciones_stock)
						.leftJoin(contactos, eq(ubicaciones_stock.contacto_distribuidor_id, contactos.id))
						.where(eq(ubicaciones_stock.activo, true))
						.orderBy(ubicaciones_stock.tipo, contactos.razon_social),
				() =>
					tx
						.select({
							id: productos.id,
							codigo: productos.codigo,
							nombre: productos.nombre
						})
						.from(productos)
						.where(eq(productos.activo, true))
						.orderBy(productos.nombre),
				() =>
					tx
						.select({
							producto_id: movimientos_stock.producto_id,
							origen_id: movimientos_stock.ubicacion_origen_id,
							destino_id: movimientos_stock.ubicacion_destino_id,
							cantidad: movimientos_stock.cantidad
						})
						.from(movimientos_stock),
				() =>
					tx
						.select({
							producto_id: lineas_pedido.producto_id,
							ubicacion_id: reservas_stock.ubicacion_stock_id,
							cantidad: reservas_stock.cantidad
						})
						.from(reservas_stock)
						.innerJoin(lineas_pedido, eq(reservas_stock.linea_pedido_id, lineas_pedido.id))
						.where(eq(reservas_stock.estado, 'reservada')),
				() =>
					tx
						.select({ id: contactos.id, nombre: contactos.razon_social })
						.from(contactos)
						.where(eq(contactos.es_distribuidor, true))
						.orderBy(contactos.razon_social),
				() =>
					tx
						.select({
							id: movimientos_stock.id,
							fecha: movimientos_stock.created_at,
							tipo: movimientos_stock.tipo,
							cantidad: movimientos_stock.cantidad,
							producto_codigo: productos.codigo,
							producto_nombre: productos.nombre,
							origen: sql<
								string | null
							>`COALESCE(${contactoOrigen.razon_social}, ${origen.nombre})`,
							destino: sql<
								string | null
							>`COALESCE(${contactoDestino.razon_social}, ${destino.nombre})`,
							observaciones: movimientos_stock.observaciones
						})
						.from(movimientos_stock)
						.innerJoin(productos, eq(movimientos_stock.producto_id, productos.id))
						.leftJoin(origen, eq(movimientos_stock.ubicacion_origen_id, origen.id))
						.leftJoin(destino, eq(movimientos_stock.ubicacion_destino_id, destino.id))
						.leftJoin(contactoOrigen, eq(origen.contacto_distribuidor_id, contactoOrigen.id))
						.leftJoin(contactoDestino, eq(destino.contacto_distribuidor_id, contactoDestino.id))
						.orderBy(desc(movimientos_stock.created_at), desc(movimientos_stock.id))
						.limit(50)
			);

		const productosPorId = new Map(productosRows.map((producto) => [producto.id, producto]));
		const ubicacionesPorId = new Map(ubicaciones.map((ubicacion) => [ubicacion.id, ubicacion]));
		const balances = new Map<string, { existencia: number; reservada: number }>();
		const obtenerBalance = (ubicacionId: number, productoId: number) => {
			const clave = `${ubicacionId}:${productoId}`;
			let balance = balances.get(clave);
			if (!balance) {
				balance = { existencia: 0, reservada: 0 };
				balances.set(clave, balance);
			}
			return balance;
		};

		for (const movimiento of movimientos) {
			if (movimiento.destino_id != null) {
				obtenerBalance(movimiento.destino_id, movimiento.producto_id).existencia +=
					movimiento.cantidad;
			}
			if (movimiento.origen_id != null) {
				obtenerBalance(movimiento.origen_id, movimiento.producto_id).existencia -=
					movimiento.cantidad;
			}
		}
		for (const reserva of reservas) {
			if (reserva.producto_id != null) {
				obtenerBalance(reserva.ubicacion_id, reserva.producto_id).reservada += reserva.cantidad;
			}
		}

		return {
			ubicaciones: ubicaciones.map((ubicacion) => ({
				...ubicacion,
				nombre: ubicacion.distribuidor || ubicacion.nombre
			})),
			distribuidores,
			productos: productosRows,
			historial: historial.map((movimiento) => ({
				...movimiento,
				tipo: movimiento.tipo as keyof typeof ETIQUETAS_MOVIMIENTO_STOCK
			})),
			balances: [...balances.entries()]
				.map(([clave, balance]) => {
					const [ubicacionId, productoId] = clave.split(':').map(Number);
					const producto = productosPorId.get(productoId);
					const ubicacion = ubicacionesPorId.get(ubicacionId);
					if (!producto || !ubicacion) return null;
					return {
						ubicacion_id: ubicacionId,
						ubicacion_nombre: ubicacion.nombre,
						ubicacion_tipo: ubicacion.tipo,
						producto_id: productoId,
						producto_codigo: producto.codigo,
						producto_nombre: producto.nombre,
						existencia: balance.existencia,
						reservada: balance.reservada,
						disponible: balance.existencia - balance.reservada
					};
				})
				.filter((balance): balance is NonNullable<typeof balance> => balance !== null)
				.sort(
					(a, b) =>
						a.ubicacion_id - b.ubicacion_id || a.producto_nombre.localeCompare(b.producto_nombre)
				)
		};
	});
}

export async function registrarMovimientoStockServicio({
	tipo,
	productoId,
	cantidad,
	distribuidorId,
	usuarioId,
	observaciones
}: {
	tipo: TipoMovimientoStock;
	productoId: number;
	cantidad: number;
	distribuidorId?: number;
	usuarioId: number;
	observaciones?: string;
}) {
	return db.transaction(async (tx) => {
		const [producto] = await tx
			.select({ id: productos.id })
			.from(productos)
			.where(eq(productos.id, productoId))
			.limit(1);
		if (!producto) error(404, 'Producto no encontrado');

		const definicion = TIPOS_MOVIMIENTO_STOCK.find((item) => item.value === tipo);
		if (!definicion) error(400, 'Tipo de movimiento no válido');
		if (definicion.requiereDistribuidor && !distribuidorId) {
			error(400, 'Seleccioná un distribuidor');
		}
		const ubicacion = async (tipoUbicacion: TipoUbicacionStock) => {
			if (tipoUbicacion === UBICACIONES_STOCK.DEPOSITO) return obtenerUbicacionCentral(tx);
			return obtenerUbicacionDistribuidor(tx, distribuidorId!);
		};
		const origenId = definicion.origen ? await ubicacion(definicion.origen) : null;
		const destinoId = definicion.destino ? await ubicacion(definicion.destino) : null;

		if (origenId != null) {
			const disponible = await obtenerStockDisponibleTx(tx, productoId, origenId);
			if (disponible < cantidad) {
				error(400, `Stock insuficiente. Disponible: ${disponible} unidades.`);
			}
		}

		const [movimiento] = await tx
			.insert(movimientos_stock)
			.values({
				producto_id: productoId,
				ubicacion_origen_id: origenId,
				ubicacion_destino_id: destinoId,
				cantidad,
				tipo,
				usuario_id: usuarioId,
				observaciones: observaciones?.trim() || null
			})
			.returning({ id: movimientos_stock.id });
		return movimiento;
	});
}
