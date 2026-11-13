import { avisarPedidoNuevo } from './avisos.server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, form, query, requested } from '$app/server';
import { db } from '$lib/server/db';
import { pedidos } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ocultar, puedeVerImportes, requirePermission } from '$lib/server/auth/permissions';
import { listarEstados } from '$lib/server/estados';
import { clavesAdjuntos, eliminarArchivos } from '$lib/modulos/adjuntos/adjuntos.server';
import { getInsumos } from '$lib/modulos/insumos/insumos.remote';
import {
	PedidoSchema,
	crearPedidoServicio,
	cambiarEstadoPedidoServicio,
	getHistorialPedidoServicio,
	getLineasPedidoSinOrdenServicio,
	getPedidosActivosServicio,
	getPedidosListado,
	obtenerPedidoDetalle
} from '$lib/modulos/pedidos/pedidos.server';
import {
	EdicionPedidoSchema,
	bloqueosLineasPedido,
	editarPedidoServicio
} from '$lib/modulos/pedidos/edicion.server';
import { cambiarMonedaTx } from '$lib/modulos/ventas/moneda.server';
import { CambioMonedaSchema } from '$lib/modulos/ventas/moneda.schema';

const idDesdeTexto = v.pipe(v.union([v.string(), v.number()]), v.transform(Number), v.integer());

function refrescarPedidos(id?: number) {
	requested(getPedidos, 1).refreshAll();
	getPedidosActivos({}).refresh();
	if (id) {
		getPedidoById(id).refresh();
		getHistorialPedido(id).refresh();
	}
}

export const getPedidos = query(
	v.object({
		search: v.optional(v.string()),
		estadoId: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async (filtros) => {
		const user = await requirePermission('pedidos', 'view');
		const resultado = await getPedidosListado(filtros);
		if (await puedeVerImportes(user)) return resultado;
		return {
			...resultado,
			data: resultado.data.map((pedido) => ocultar(pedido, ['total', 'pagado']))
		};
	}
);

export const getPedidoById = query(v.number(), async (id) => {
	const user = await requirePermission('pedidos', 'view');
	const detalle = await obtenerPedidoDetalle(id);
	if (await puedeVerImportes(user)) return detalle;

	return {
		...detalle,
		pedido: ocultar(detalle.pedido, [
			'anticipo',
			'total',
			'monto_credito_distribuidor',
			'porcentaje_comision_distribuidor',
			'monto_comision_distribuidor'
		]),
		lineas: detalle.lineas.map((linea) =>
			ocultar(linea, [
				'precio_unitario',
				'precio_lista_unitario',
				'margen_porcentaje',
				'costo_materiales',
				'subtotal',
				'insumos_snapshot'
			])
		),
		insumosAdicionales: detalle.insumosAdicionales.map((insumo) =>
			ocultar(insumo, ['costo_unitario', 'precio_lista_unitario', 'precio_unitario'])
		)
	};
});

export const getEstadosPedido = query(async () => {
	await requirePermission('pedidos', 'view');
	return listarEstados('pedido');
});

export const getLineasPedidoSinOrden = query(
	v.object({
		pedido_id: v.optional(idDesdeTexto),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async (filtros) => {
		await requirePermission('fabricacion', 'view');
		return getLineasPedidoSinOrdenServicio(filtros);
	}
);

export const getHistorialPedido = query(v.number(), async (pedidoId) => {
	const user = await requirePermission('pedidos', 'view');
	const historial = await getHistorialPedidoServicio(pedidoId);
	if (await puedeVerImportes(user)) return historial;
	return historial.map((evento) =>
		evento.tipo === 'pago' ? { ...evento, detalle: null } : evento
	);
});

export const getPedidosActivos = query(
	v.object({ semana: v.optional(v.boolean()) }),
	async ({ semana }) => {
		const user = await requirePermission('pedidos', 'view');
		const activos = await getPedidosActivosServicio({ semana });
		if (await puedeVerImportes(user)) return activos;
		return activos.map((pedido) => ocultar(pedido, ['total', 'saldo_pendiente']));
	}
);

export const cambiarEstadoPedido = command(
	v.object({
		pedido_id: idDesdeTexto,
		estado_destino_id: idDesdeTexto,
		comentario: v.optional(v.string())
	}),
	async (cambio) => {
		const user = await requirePermission('pedidos', 'edit');
		const resultado = await cambiarEstadoPedidoServicio(cambio, user.id);
		refrescarPedidos(cambio.pedido_id);
		return resultado;
	}
);

export const eliminarPedido = command(v.number(), async (pedidoId) => {
	await requirePermission('pedidos', 'delete');
	const claves = await clavesAdjuntos('pedido', pedidoId);
	const [eliminado] = await db
		.delete(pedidos)
		.where(eq(pedidos.id, pedidoId))
		.returning({ id: pedidos.id });
	if (!eliminado) error(404, 'Pedido no encontrado');
	await eliminarArchivos(claves);
	refrescarPedidos();
	return { success: true };
});

export const crearPedido = form(PedidoSchema, async (data) => {
	const user = await requirePermission('pedidos', 'create');
	if (data.lineas.some((linea) => linea.stock_ubicacion_id)) {
		await requirePermission('stock', 'edit');
	}
	const creaInsumos = data.lineas.some((linea) => linea.nuevo_insumo);
	if (creaInsumos) await requirePermission('insumos', 'create');

	const pedido = await crearPedidoServicio(data, user.id);
	await avisarPedidoNuevo(pedido.id, user.id);
	refrescarPedidos();
	if (creaInsumos) getInsumos({ limit: 100 }).refresh();
	return { pedidoId: pedido.id };
});

export const getPedidoParaEditar = query(v.number(), async (id) => {
	await requirePermission('pedidos', 'edit');
	await requirePermission('importes', 'view');
	const [detalle, bloqueos] = await Promise.all([
		obtenerPedidoDetalle(id),
		bloqueosLineasPedido(id)
	]);
	return {
		pedido: detalle.pedido,
		lineas: detalle.lineas.map((linea) => ({ ...linea, bloqueo: bloqueos.get(linea.id) ?? null })),
		insumosAdicionales: detalle.insumosAdicionales
	};
});

export const editarPedido = command(EdicionPedidoSchema, async (data) => {
	const user = await requirePermission('pedidos', 'edit');
	await requirePermission('importes', 'view');
	if (data.lineas.some((linea) => linea.nuevo_insumo)) await requirePermission('insumos', 'create');
	await editarPedidoServicio(data, user.id);
	refrescarPedidos(data.pedido_id);
	getPedidoParaEditar(data.pedido_id).refresh();
	return { success: true };
});

export const cambiarMonedaPedido = command(CambioMonedaSchema, async (cambio) => {
	const user = await requirePermission('pedidos', 'edit');
	await requirePermission('importes', 'view');
	await db.transaction((tx) => cambiarMonedaTx(tx, { ...cambio, documento: 'pedido' }, user.id));
	refrescarPedidos(cambio.id);
	return { success: true };
});
