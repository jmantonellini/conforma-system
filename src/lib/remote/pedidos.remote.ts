import * as v from 'valibot';
import { command, form, query, requested } from '$app/server';
import { db } from '$lib/server/db';
import { adjuntos, pedidos, lineas_pedido, estados_pedido } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission, tienePermiso } from '$lib/server/auth/permissions';
import { eliminarObjeto } from '$lib/server/services/object-storage.service';
import { normalizarPrecioPendiente } from '$lib/utils/precios';
import { getInsumos } from '$lib/remote/insumos.remote';
import {
	PedidoSchema,
	crearPedidoServicio,
	cambiarEstadoPedidoServicio,
	getEstadosPedidoServicio,
	getHistorialPedidoServicio,
	getLineasPedidoSinOrdenServicio,
	getPedidosActivosServicio,
	getPedidosListado,
	obtenerPedidoDetalle
} from '$lib/server/services/pedidos.service';

const toNumberOrUndefined = (value: string | number | null | undefined) => {
	if (value === null || value === undefined || value === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizarPedidoPayload = <T extends Record<string, unknown>>(data: T) => ({
	...data,
	contacto_id: Number(data.contacto_id),
	contacto_distribuidor_id:
		toNumberOrUndefined(data.contacto_distribuidor_id as string | number | null | undefined) ??
		null,
	usar_credito_distribuidor: Boolean(data.usar_credito_distribuidor ?? false),
	monto_credito_distribuidor: Number(data.monto_credito_distribuidor ?? 0),
	porcentaje_comision_distribuidor: Number(data.porcentaje_comision_distribuidor ?? 0),
	anticipo: Number(data.anticipo ?? 0),
	lineas: Array.isArray(data.lineas)
		? data.lineas.map((linea) => ({
				...linea,
				tipo: (linea as { tipo?: 'producto' | 'insumo' | 'concepto' }).tipo,
				visible_cliente: (linea as { visible_cliente?: boolean }).visible_cliente !== false,
				producto_id: String((linea as { producto_id?: string | number }).producto_id ?? ''),
				insumo_id: Number((linea as { insumo_id?: string | number }).insumo_id) || undefined,
				stock_ubicacion_id:
					Number((linea as { stock_ubicacion_id?: string | number }).stock_ubicacion_id) ||
					undefined,
				cantidad: Number((linea as { cantidad?: number }).cantidad ?? 0),
				precio: normalizarPrecioPendiente((linea as { precio?: string | number | null }).precio),
				precio_lista: normalizarPrecioPendiente(
					(linea as { precio_lista?: string | number | null }).precio_lista
				),
				costo_materiales: Number((linea as { costo_materiales?: number }).costo_materiales ?? 0),
				nuevo_insumo: (linea as { nuevo_insumo?: unknown }).nuevo_insumo,
				insumos_asociados: (linea as { insumos_asociados?: unknown }).insumos_asociados ?? [],
				descripcion: (linea as { descripcion?: string | null }).descripcion ?? undefined
			}))
		: []
});

const refrescarCachesPedido = () => {
	getPedidos({ search: '', page: 1 }).refresh();
	getPedidosActivos({}).refresh();
	requested(getPedidos, 1).refreshAll();
};

export const getPedidos = query(
	v.object({
		search: v.optional(v.string()),
		estadoId: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async ({ search, estadoId, page = 1, limit = 50 }) => {
		const user = await requirePermission('pedidos', 'view');
		const resultado = await getPedidosListado({ search, estadoId, page, limit });
		return (await tienePermiso(user, 'importes', 'view'))
			? resultado
			: {
					...resultado,
					data: resultado.data.map((pedido) => ({ ...pedido, total: null }))
				};
	}
);

export const getPedidoById = query(v.number(), async (id) => {
	const user = await requirePermission('pedidos', 'view');
	const detalle = await obtenerPedidoDetalle(id);
	if (await tienePermiso(user, 'importes', 'view')) return detalle;

	return {
		...detalle,
		pedido: {
			...detalle.pedido,
			anticipo: null,
			total: null,
			monto_credito_distribuidor: null,
			porcentaje_comision_distribuidor: null,
			monto_comision_distribuidor: null
		},
		lineas: detalle.lineas.map((linea) => ({
			...linea,
			precio_unitario: null,
			precio_lista_unitario: null,
			margen_porcentaje: null,
			costo_materiales: null,
			subtotal: null
		})),
		insumosAdicionales: detalle.insumosAdicionales.map((insumo) => ({
			...insumo,
			costo_unitario: null,
			precio_lista_unitario: null,
			precio_unitario: null
		}))
	};
});

export const getEstadosPedido = query(async () => {
	return getEstadosPedidoServicio();
});

export const getLineasPedidoSinOrden = query(
	v.object({
		pedido_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async ({ pedido_id, limit }) => {
		return getLineasPedidoSinOrdenServicio({ pedido_id, limit });
	}
);

export const getHistorialPedido = query(v.number(), async (pedidoId) => {
	const user = await requirePermission('pedidos', 'view');
	const historial = await getHistorialPedidoServicio(pedidoId);
	if (await tienePermiso(user, 'importes', 'view')) return historial;
	return historial.map((evento) =>
		evento.tipo === 'pago' ? { ...evento, detalle: null } : evento
	);
});

export const getPedidosActivos = query(
	v.object({
		semana: v.optional(v.boolean())
	}),
	async ({ semana }) => {
		const user = await requirePermission('pedidos', 'view');
		const pedidos = await getPedidosActivosServicio({ semana });
		if (await tienePermiso(user, 'importes', 'view')) return pedidos;
		return pedidos.map((pedido) => ({ ...pedido, total: null, saldo_pendiente: null }));
	}
);

export const cambiarEstadoPedido = command(
	v.object({
		pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
		estado_destino_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async ({ pedido_id, estado_destino_id, comentario }) => {
		const result = await cambiarEstadoPedidoServicio({
			pedido_id,
			estado_destino_id,
			comentario
		});

		refrescarCachesPedido();
		getPedidoById(pedido_id).refresh();
		getHistorialPedido(pedido_id).refresh();
		return result;
	}
);

export const eliminarPedido = command(v.number(), async (pedidoId) => {
	await requirePermission('pedidos', 'delete');
	const archivos = await db
		.select({ archivo_key: adjuntos.archivo_key })
		.from(adjuntos)
		.where(eq(adjuntos.pedido_id, pedidoId));

	await db.delete(pedidos).where(eq(pedidos.id, pedidoId));
	await db.delete(lineas_pedido).where(eq(lineas_pedido.pedido_id, pedidoId));
	await Promise.all(archivos.map((archivo) => eliminarObjeto(archivo.archivo_key)));

	refrescarCachesPedido();
	return { success: true };
});

export const eliminarEstadoPedido = command(v.number(), async (id) => {
	await db.delete(estados_pedido).where(eq(estados_pedido.id, id));
	getEstadosPedido().refresh();
	return { success: true };
});

export const crearPedido = form(PedidoSchema, async (data) => {
	const pedido = await crearPedidoServicio(normalizarPedidoPayload(data));
	refrescarCachesPedido();
	if (data.lineas.some((linea) => linea.nuevo_insumo)) {
		getInsumos({ limit: 100 }).refresh();
	}
	return { pedidoId: pedido.id };
});

export const crearEstadoPedido = form(
	v.object({
		nombre: v.string(),
		color: v.string(),
		grupo: v.picklist(['inicial', 'proceso', 'final', 'excepcion']),
		esFinal: v.optional(v.boolean(), false),
		orden: v.optional(v.number(), 0)
	}),
	async (data) => {
		const slug = data.nombre.toLowerCase().replace(/\s+/g, '-');
		await db.insert(estados_pedido).values({ slug, ...data });
		getEstadosPedido().refresh();
		return { success: true };
	}
);
