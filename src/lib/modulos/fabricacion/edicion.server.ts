import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db, type Tx } from '$lib/server/db';
import {
	empleados,
	estados,
	lineas_pedido,
	ordenes_fabricacion,
	pedidos,
	productos,
	reservas_stock,
	unidades_fabricacion
} from '$lib/server/db/schema';
import { registrarAuditoria } from '$lib/server/auditoria';
import {
	getProductoConRecetaService,
	obtenerPrecioProducto
} from '$lib/modulos/productos/productos.server';
import { snapshotReceta } from '$lib/modulos/ventas/lineas.server';
import { factorDesdeUsd } from '$lib/utils/moneda';
import { redondearPrecio } from '$lib/utils/precios';
import { fechaDesdeInput, fechaInput } from '$lib/utils/fechas';
import { ESTADO_INICIAL_FABRICACION, ETIQUETA_PRIORIDAD } from './tipos';
import type { EdicionOrden } from './fabricacion.schema';

export const MOTIVO_PRODUCTO_FIJO = {
	iniciada: 'Ya hay unidades en producción',
	reserva: 'La línea del pedido tiene stock reservado',
	cerrado: 'El pedido ya está cerrado'
} as const;

export async function motivoProductoFijo(
	ordenId: number,
	lineaPedidoId: number | null,
	ejecutor: Tx | typeof db = db
) {
	const [iniciada] = await ejecutor
		.select({ id: unidades_fabricacion.id })
		.from(unidades_fabricacion)
		.innerJoin(estados, eq(estados.id, unidades_fabricacion.estado_id))
		.where(
			and(
				eq(unidades_fabricacion.orden_fabricacion_id, ordenId),
				ne(estados.slug, ESTADO_INICIAL_FABRICACION)
			)
		)
		.limit(1);
	if (iniciada) return MOTIVO_PRODUCTO_FIJO.iniciada;
	if (!lineaPedidoId) return null;
	const [[reserva], [pedido]] = await Promise.all([
		ejecutor
			.select({ id: reservas_stock.id })
			.from(reservas_stock)
			.where(eq(reservas_stock.linea_pedido_id, lineaPedidoId))
			.limit(1),
		ejecutor
			.select({ es_final: estados.es_final })
			.from(lineas_pedido)
			.innerJoin(pedidos, eq(pedidos.id, lineas_pedido.pedido_id))
			.innerJoin(estados, eq(estados.id, pedidos.estado_id))
			.where(eq(lineas_pedido.id, lineaPedidoId))
	]);
	if (reserva) return MOTIVO_PRODUCTO_FIJO.reserva;
	if (pedido?.es_final) return MOTIVO_PRODUCTO_FIJO.cerrado;
	return null;
}

const fechaTexto = (valor: Date | string | null) => (valor ? fechaInput(valor) : null);

const textoFecha = (valor: string | null) =>
	valor ? valor.split('-').reverse().join('/') : 'sin fecha';

async function nombresEmpleados(ids: (number | null)[]) {
	const validos = ids.filter((id): id is number => id !== null);
	if (!validos.length) return new Map<number, string>();
	const filas = await db
		.select({ id: empleados.id, nombre: empleados.nombre, apellido: empleados.apellido })
		.from(empleados)
		.where(inArray(empleados.id, validos));
	return new Map(filas.map((fila) => [fila.id, `${fila.nombre} ${fila.apellido ?? ''}`.trim()]));
}

async function nombreProducto(id: number | null) {
	if (!id) return 'Trabajo personalizado';
	const [producto] = await db
		.select({ nombre: productos.nombre })
		.from(productos)
		.where(eq(productos.id, id));
	return producto?.nombre ?? 'Producto';
}

export async function editarOrdenServicio(data: EdicionOrden, usuarioId: number) {
	return db.transaction(async (tx) => {
		const [orden] = await tx
			.select({
				id: ordenes_fabricacion.id,
				nombre_trabajo: ordenes_fabricacion.nombre_trabajo,
				observaciones: ordenes_fabricacion.observaciones,
				prioridad: ordenes_fabricacion.prioridad,
				fecha_fin_estimada: ordenes_fabricacion.fecha_fin_estimada,
				asignado_a: ordenes_fabricacion.asignado_a,
				producto_id: ordenes_fabricacion.producto_id,
				linea_pedido_id: ordenes_fabricacion.linea_pedido_id
			})
			.from(ordenes_fabricacion)
			.where(eq(ordenes_fabricacion.id, data.id))
			.for('update');
		if (!orden) error(404, 'Orden no encontrada');

		const [linea] = orden.linea_pedido_id
			? await tx
					.select({
						producto_id: lineas_pedido.producto_id,
						pedido_id: pedidos.id,
						numero: pedidos.numero_pedido,
						moneda: pedidos.moneda,
						tipo_cambio: pedidos.tipo_cambio,
						es_final: estados.es_final
					})
					.from(lineas_pedido)
					.innerJoin(pedidos, eq(pedidos.id, lineas_pedido.pedido_id))
					.innerJoin(estados, eq(estados.id, pedidos.estado_id))
					.where(eq(lineas_pedido.id, orden.linea_pedido_id))
					.for('update', { of: lineas_pedido })
			: [];

		const productoActual = linea ? linea.producto_id : orden.producto_id;
		const cambiaProducto = data.producto_id !== null && data.producto_id !== productoActual;
		const cambios: string[] = [];

		if (cambiaProducto) {
			const motivo = await motivoProductoFijo(orden.id, orden.linea_pedido_id, tx);
			if (motivo) error(409, `${motivo}: el producto ya no se puede cambiar`);
			const [anterior, nuevo] = await Promise.all([
				nombreProducto(productoActual),
				nombreProducto(data.producto_id)
			]);
			cambios.push(`Producto: ${anterior} → ${nuevo}`);

			if (linea && orden.linea_pedido_id) {
				const factor = factorDesdeUsd(linea);
				const enMoneda = (valorUsd: number | null | undefined) =>
					redondearPrecio((valorUsd ?? 0) * factor);
				const [producto, precio] = await Promise.all([
					getProductoConRecetaService(data.producto_id!),
					obtenerPrecioProducto(data.producto_id!)
				]);
				await tx
					.update(lineas_pedido)
					.set({
						producto_id: data.producto_id,
						es_personalizado: false,
						descripcion_personalizada: null,
						insumos_snapshot: snapshotReceta(producto, enMoneda),
						costo_materiales: enMoneda(precio.costo_materiales),
						margen_porcentaje: precio.margen_porcentaje,
						updated_at: new Date()
					})
					.where(eq(lineas_pedido.id, orden.linea_pedido_id));
				await registrarAuditoria(tx, {
					entidad: 'pedido',
					entidadId: linea.pedido_id,
					usuarioId,
					accion: 'producto',
					detalle: `OF-${orden.id}: ${anterior} → ${nuevo}. El precio no cambió.`
				});
			}
		} else if (linea?.es_final) {
			error(409, `El pedido ${linea.numero} ya está cerrado`);
		}

		const nombre = data.nombre_trabajo;
		if (nombre !== orden.nombre_trabajo)
			cambios.push(`Nombre: ${orden.nombre_trabajo} → ${nombre}`);
		const observaciones = data.observaciones?.trim() || null;
		if (observaciones !== (orden.observaciones?.trim() || null)) {
			cambios.push(observaciones ? 'Especificaciones actualizadas' : 'Especificaciones quitadas');
		}
		const prioridadAnterior = orden.prioridad ?? 0;
		if (data.prioridad !== prioridadAnterior) {
			cambios.push(
				`Prioridad: ${ETIQUETA_PRIORIDAD[prioridadAnterior]?.nombre} → ${ETIQUETA_PRIORIDAD[data.prioridad]?.nombre}`
			);
		}
		const fechaAnterior = fechaTexto(orden.fecha_fin_estimada);
		if (data.fecha_fin_estimada !== fechaAnterior) {
			cambios.push(
				`Entrega estimada: ${textoFecha(fechaAnterior)} → ${textoFecha(data.fecha_fin_estimada)}`
			);
		}
		const cambiaAsignado = data.asignado_a !== orden.asignado_a;
		if (cambiaAsignado) {
			const nombres = await nombresEmpleados([orden.asignado_a, data.asignado_a]);
			const etiqueta = (id: number | null) => (id && nombres.get(id)) || 'sin asignar';
			cambios.push(`Asignado: ${etiqueta(orden.asignado_a)} → ${etiqueta(data.asignado_a)}`);
		}

		if (!cambios.length) return { cambios, orden: null };

		await tx
			.update(ordenes_fabricacion)
			.set({
				nombre_trabajo: nombre,
				observaciones,
				prioridad: data.prioridad,
				fecha_fin_estimada: data.fecha_fin_estimada
					? fechaDesdeInput(data.fecha_fin_estimada)
					: null,
				asignado_a: data.asignado_a,
				...(cambiaProducto && !linea ? { producto_id: data.producto_id } : {}),
				updated_at: new Date()
			})
			.where(eq(ordenes_fabricacion.id, orden.id));
		await registrarAuditoria(tx, {
			entidad: 'orden_fabricacion',
			entidadId: orden.id,
			usuarioId,
			accion: cambiaProducto ? 'producto' : 'edicion',
			detalle: cambios.join('\n')
		});

		return {
			cambios,
			orden: {
				id: orden.id,
				nombre_trabajo: nombre,
				pedido_id: linea?.pedido_id ?? null,
				asignado_nuevo: cambiaAsignado ? data.asignado_a : null,
				cambia_producto: cambiaProducto
			}
		};
	});
}
