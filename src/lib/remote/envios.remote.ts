import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { envios, transportistas, pedidos, contactos } from '$lib/server/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';

export const getTransportistas = query(async () => {
	return db.select().from(transportistas).where(eq(transportistas.activo, true));
});

export const getEnvios = query(
	v.object({
		estado: v.optional(v.picklist(['entregado', 'preparado', 'despachado'])),
		page: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ estado, page, limit }) => {
		const offset = (page - 1) * limit;
		const where = estado ? eq(envios.estado, estado) : undefined;

		const data = await db
			.select({
				id: envios.id,
				pedido_id: envios.pedido_id,
				numero_guia: envios.numero_guia,
				estado: envios.estado,
				fecha_envio: envios.fecha_envio,
				fecha_entrega: envios.fecha_entrega,
				cantidad_bultos: envios.cantidad_bultos,
				transportista: transportistas.nombre,
				pedido_numero: pedidos.numero_pedido,
				cliente_nombre: contactos.razon_social
			})
			.from(envios)
			.innerJoin(transportistas, eq(envios.transportista_id, transportistas.id))
			.innerJoin(pedidos, eq(envios.pedido_id, pedidos.id))
			.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
			.where(where)
			.orderBy(desc(envios.created_at))
			.limit(limit)
			.offset(offset);

		const [total] = await db.select({ count: count() }).from(envios).where(where);

		return { data, total: total?.count ?? 0, page, limit };
	}
);

export const getEnviosByPedido = query(v.number(), async (pedidoId) => {
	return db
		.select({
			id: envios.id,
			numero_guia: envios.numero_guia,
			estado: envios.estado,
			fecha_envio: envios.fecha_envio,
			fecha_entrega: envios.fecha_entrega,
			cantidad_bultos: envios.cantidad_bultos,
			observaciones: envios.observaciones,
			transportista: transportistas.nombre
		})
		.from(envios)
		.innerJoin(transportistas, eq(envios.transportista_id, transportistas.id))
		.where(eq(envios.pedido_id, pedidoId))
		.orderBy(desc(envios.created_at));
});

const EnvioSchema = v.object({
	pedido_id: v.pipe(v.string(), v.transform(Number), v.number()),
	transportista_id: v.pipe(v.string(), v.transform(Number), v.number()),
	numero_guia: v.optional(v.string()),
	cantidad_bultos: v.optional(v.number(), 1),
	observaciones: v.optional(v.string())
});

const refrescarCachesEnvio = async (pedidoId?: number) => {
	await Promise.all([
		getEnvios({ page: 1 }).refresh(),
		...(pedidoId ? [getEnviosByPedido(pedidoId).refresh()] : [])
	]);
};

export const crearEnvio = form(EnvioSchema, async (data) => {
	await requirePermission('pedidos', 'edit');
	await db.insert(envios).values({
		pedido_id: data.pedido_id,
		transportista_id: data.transportista_id,
		numero_guia: data.numero_guia || null,
		cantidad_bultos: data.cantidad_bultos,
		fecha_envio: new Date(),
		estado: 'despachado'
	});

	await refrescarCachesEnvio(data.pedido_id);

	return { success: true };
});

export const marcarEntregado = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (envioId) => {
		await requirePermission('pedidos', 'edit');
		const [envio] = await db
			.select({ pedido_id: envios.pedido_id })
			.from(envios)
			.where(eq(envios.id, envioId))
			.limit(1);

		await db
			.update(envios)
			.set({ estado: 'entregado', fecha_entrega: new Date() })
			.where(eq(envios.id, envioId));

		await refrescarCachesEnvio(envio?.pedido_id);
		return { success: true };
	}
);
