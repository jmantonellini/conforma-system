import * as v from 'valibot';
import { command, form, query, requested } from '$app/server';
import { db } from '$lib/server/db';
import { pedidos, lineas_pedido, estados_pedido } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';
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
				producto_id: String((linea as { producto_id?: string | number }).producto_id ?? ''),
				cantidad: Number((linea as { cantidad?: number }).cantidad ?? 0),
				precio: Number((linea as { precio?: number }).precio ?? 0),
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
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({ search, estadoId, page = 1, limit = 10 }) => {
		return getPedidosListado({ search, estadoId, page, limit });
	}
);

export const getPedidoById = query(v.number(), async (id) => {
	return obtenerPedidoDetalle(id);
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
	return getHistorialPedidoServicio(pedidoId);
});

export const getPedidosActivos = query(
	v.object({
		semana: v.optional(v.boolean())
	}),
	async ({ semana }) => {
		return getPedidosActivosServicio({ semana });
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
	await db.delete(pedidos).where(eq(pedidos.id, pedidoId));
	await db.delete(lineas_pedido).where(eq(lineas_pedido.pedido_id, pedidoId));

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

	redirect(303, resolve(`/pedidos/${pedido.id}`));
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
