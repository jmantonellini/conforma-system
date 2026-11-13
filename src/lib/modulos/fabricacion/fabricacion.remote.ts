import { notificar, participantesOrden } from '$lib/modulos/notificaciones/notificaciones.server';
import { ESTADO_FABRICACION } from './tipos';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { form, command, requested } from '$app/server';
import { db, type Tx } from '$lib/server/db';
import {
	estados,
	logs_cambios_estado,
	movimientos_stock,
	ordenes_fabricacion,
	productos,
	unidades_fabricacion,
	lineas_pedido
} from '$lib/server/db/schema';
import { and, desc, eq, ne } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';
import { estadoPorSlug, registrarCambioEstado, validarTransicion } from '$lib/server/estados';
import { clavesAdjuntos, eliminarArchivos } from '$lib/modulos/adjuntos/adjuntos.server';
import { moverPedidoAutomatico } from '$lib/modulos/pedidos/pedidos.server';
import { registrarIngresoProduccionTx } from '$lib/modulos/stock/stock.server';
import { PEDIDO_SLUG } from '$lib/modulos/pedidos/tipos';
import { CrearOrdenSchema } from './fabricacion.schema';
import { getPedidos } from '../pedidos/pedidos.remote';
import {
	getOrdenFabricacion,
	getOrdenesFabricacion,
	getHistorialUnidades
} from './fabricacion-consultas.remote';
import { getStockDisponibilidad } from '../stock/stock.remote';

const idDesdeTexto = v.pipe(v.union([v.string(), v.number()]), v.transform(Number), v.integer());

export const crearOrdenFabricacion = form(CrearOrdenSchema, async (data) => {
	const user = await requirePermission('fabricacion', 'create');
	const esParaStock = data.origen === 'stock';
	if (esParaStock) await requirePermission('stock', 'edit');
	if (esParaStock ? !data.producto_id : !data.linea_pedido_id) {
		error(400, esParaStock ? 'Seleccioná un producto' : 'Seleccioná una línea de pedido');
	}
	const cantidadTotal = Number(data.cantidad_total);
	if (!Number.isSafeInteger(cantidadTotal) || cantidadTotal < 1) {
		error(400, 'La cantidad debe ser un entero mayor a cero');
	}
	const estadoInicial = await estadoPorSlug('fabricacion', 'preparando_material');

	const [orden, unidades] = await db.transaction(async (tx) => {
		let pedidoId: number | undefined;
		if (esParaStock) {
			const [producto] = await tx
				.select({ id: productos.id })
				.from(productos)
				.where(eq(productos.id, data.producto_id!));
			if (!producto) error(404, 'Producto no encontrado');
		} else {
			const [linea] = await tx
				.select({ pedido_id: lineas_pedido.pedido_id })
				.from(lineas_pedido)
				.where(eq(lineas_pedido.id, data.linea_pedido_id!));
			if (!linea) error(404, 'Línea de pedido no encontrada');
			pedidoId = linea.pedido_id;
		}

		const [creada] = await tx
			.insert(ordenes_fabricacion)
			.values({
				nombre_trabajo: data.nombre_trabajo,
				linea_pedido_id: esParaStock ? null : data.linea_pedido_id!,
				producto_id: esParaStock ? data.producto_id! : null,
				es_para_stock: esParaStock,
				cantidad_total: cantidadTotal,
				prioridad: data.prioridad,
				fecha_fin_estimada: data.fecha_fin_estimada ? new Date(data.fecha_fin_estimada) : null,
				asignado_a: data.asignado_a || null,
				observaciones: data.observaciones
			})
			.returning();

		const unidades = await tx
			.insert(unidades_fabricacion)
			.values(
				Array.from({ length: cantidadTotal }, (_, indice) => ({
					orden_fabricacion_id: creada.id,
					numero_serie: `${creada.id}-${String(indice + 1).padStart(3, '0')}`,
					estado_id: estadoInicial.id
				}))
			)
			.returning();

		if (pedidoId) {
			await moverPedidoAutomatico(tx, pedidoId, {
				desde: [PEDIDO_SLUG.PENDIENTE],
				hacia: PEDIDO_SLUG.EN_PRODUCCION,
				usuarioId: user.id,
				comentario: `Orden de fabricación #${creada.id} creada`
			});
		}
		return [creada, unidades] as const;
	});

	await notificar(
		{ empleados: [orden.asignado_a] },
		{
			modulo: 'fabricacion',
			titulo: `Te asignaron la OF-${orden.id}`,
			mensaje: `${orden.nombre_trabajo} · ${orden.cantidad_total} ${orden.cantidad_total === 1 ? 'unidad' : 'unidades'}`,
			link: `/fabricacion/${orden.id}`
		},
		{ actor: user.id }
	);
	requested(getOrdenesFabricacion, 1).refreshAll();
	return { success: true, orden, unidades };
});

async function completarPedidoSiTermino(tx: Tx, ordenId: number, usuarioId: number) {
	const [orden] = await tx
		.select({ pedido_id: lineas_pedido.pedido_id })
		.from(ordenes_fabricacion)
		.innerJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(eq(ordenes_fabricacion.id, ordenId));
	if (!orden) return;

	const [pendiente] = await tx
		.select({ id: unidades_fabricacion.id })
		.from(unidades_fabricacion)
		.innerJoin(estados, eq(estados.id, unidades_fabricacion.estado_id))
		.innerJoin(
			ordenes_fabricacion,
			eq(ordenes_fabricacion.id, unidades_fabricacion.orden_fabricacion_id)
		)
		.innerJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(and(eq(lineas_pedido.pedido_id, orden.pedido_id), eq(estados.es_final, false)))
		.limit(1);
	if (pendiente) return;

	await moverPedidoAutomatico(tx, orden.pedido_id, {
		desde: [PEDIDO_SLUG.PENDIENTE, PEDIDO_SLUG.EN_PRODUCCION, PEDIDO_SLUG.DEMORADO],
		hacia: PEDIDO_SLUG.COMPLETADO,
		usuarioId,
		comentario: 'Fabricación finalizada'
	});
}

async function cambiarEstado(unidadId: number, destinoId: number, comentario: string | undefined) {
	const user = await requirePermission('fabricacion', 'edit');

	const ordenId = await db.transaction(async (tx) => {
		const [unidad] = await tx
			.select({
				id: unidades_fabricacion.id,
				numero_serie: unidades_fabricacion.numero_serie,
				estado_id: unidades_fabricacion.estado_id,
				es_defectuoso: unidades_fabricacion.es_defectuoso,
				orden_id: ordenes_fabricacion.id,
				es_para_stock: ordenes_fabricacion.es_para_stock,
				producto_id: ordenes_fabricacion.producto_id,
				ingreso_stock: movimientos_stock.id
			})
			.from(unidades_fabricacion)
			.innerJoin(
				ordenes_fabricacion,
				eq(ordenes_fabricacion.id, unidades_fabricacion.orden_fabricacion_id)
			)
			.leftJoin(
				movimientos_stock,
				eq(movimientos_stock.unidad_fabricacion_id, unidades_fabricacion.id)
			)
			.where(eq(unidades_fabricacion.id, unidadId))
			.for('update', { of: unidades_fabricacion });
		if (!unidad) error(404, `Unidad ${unidadId} no encontrada`);

		const destino = await validarTransicion(tx, unidad.estado_id, destinoId);
		if (unidad.ingreso_stock && !destino.es_final) {
			error(409, 'No se puede reabrir una unidad que ya ingresó al stock');
		}

		await tx
			.update(unidades_fabricacion)
			.set({ estado_id: destino.id, comentario_estado: comentario?.trim() || null })
			.where(eq(unidades_fabricacion.id, unidadId));
		await registrarCambioEstado(tx, {
			flujo: 'fabricacion',
			entidadId: unidadId,
			usuarioId: user.id,
			anteriorId: unidad.estado_id,
			nuevoId: destino.id,
			comentario
		});

		if (destino.slug === ESTADO_FABRICACION.PAUSADO) {
			await notificar(
				await participantesOrden(unidad.orden_id, tx),
				{
					modulo: 'fabricacion',
					titulo: `Producción pausada en OF-${unidad.orden_id}`,
					mensaje: `Unidad ${unidad.numero_serie}${comentario ? ` · ${comentario}` : ''}`,
					link: `/fabricacion/${unidad.orden_id}`
				},
				{ actor: user.id, ejecutor: tx }
			);
		}

		if (destino.es_final) {
			if (unidad.es_para_stock && unidad.producto_id && !unidad.es_defectuoso) {
				await registrarIngresoProduccionTx(tx, {
					productoId: unidad.producto_id,
					unidadId,
					usuarioId: user.id
				});
			}
			await completarPedidoSiTermino(tx, unidad.orden_id, user.id);
		}
		return unidad.orden_id;
	});

	requested(getPedidos, 1).refreshAll();
	getStockDisponibilidad().refresh();
	getOrdenFabricacion(ordenId).refresh();
	getHistorialUnidades(ordenId).refresh();
	return { success: true };
}

export const cambiarEstadoUnidad = command(
	v.object({
		unidad_id: idDesdeTexto,
		estado_destino_id: idDesdeTexto,
		comentario: v.optional(v.string())
	}),
	({ unidad_id, estado_destino_id, comentario }) =>
		cambiarEstado(unidad_id, estado_destino_id, comentario)
);

export const reanudarUnidad = command(
	v.object({ unidad_id: idDesdeTexto, comentario: v.optional(v.string()) }),
	async ({ unidad_id, comentario }) => {
		const pausado = await estadoPorSlug('fabricacion', 'pausado');
		const [unidad] = await db
			.select({ estado_id: unidades_fabricacion.estado_id })
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.id, unidad_id));
		if (!unidad) error(404, `Unidad ${unidad_id} no encontrada`);
		if (unidad.estado_id !== pausado.id) error(409, 'La unidad no está pausada');

		const [anterior] = await db
			.select({ estado_id: logs_cambios_estado.estado_anterior_id })
			.from(logs_cambios_estado)
			.where(
				and(
					eq(logs_cambios_estado.entidad_tipo, 'unidad'),
					eq(logs_cambios_estado.entidad_id, unidad_id),
					eq(logs_cambios_estado.estado_nuevo_id, pausado.id),
					ne(logs_cambios_estado.estado_anterior_id, pausado.id)
				)
			)
			.orderBy(desc(logs_cambios_estado.created_at), desc(logs_cambios_estado.id))
			.limit(1);
		if (!anterior?.estado_id) error(409, 'No hay estado anterior para reanudar');

		return cambiarEstado(
			unidad_id,
			anterior.estado_id,
			comentario ?? `Reanudado desde ${pausado.nombre}`
		);
	}
);

export const eliminarOrdenFabricacion = command(idDesdeTexto, async (id) => {
	await requirePermission('fabricacion', 'delete');
	const [terminada] = await db
		.select({ id: unidades_fabricacion.id })
		.from(unidades_fabricacion)
		.innerJoin(estados, eq(estados.id, unidades_fabricacion.estado_id))
		.where(and(eq(unidades_fabricacion.orden_fabricacion_id, id), eq(estados.es_final, true)))
		.limit(1);
	if (terminada) error(409, 'No se puede eliminar una orden con unidades terminadas');

	const claves = await clavesAdjuntos('fabricacion', id);
	await db.delete(ordenes_fabricacion).where(eq(ordenes_fabricacion.id, id));
	await eliminarArchivos(claves);
	await requested(getOrdenesFabricacion, 5).refreshAll();
	return { success: true };
});
