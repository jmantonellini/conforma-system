import { avisarEnvio } from './avisos.server';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { envios, transportistas, pedidos, contactos } from '$lib/server/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';
import { getHistorialPedido } from './pedidos.remote';

export const getTransportistas = query(async () => {
	await requirePermission('envios', 'view');
	return db.select().from(transportistas).where(eq(transportistas.activo, true));
});

export const getEnvios = query(
	v.object({
		estado: v.optional(v.picklist(['entregado', 'preparado', 'despachado'])),
		page: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ estado, page, limit }) => {
		await requirePermission('envios', 'view');
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
	await requirePermission('envios', 'view');
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
	transportista: v.pipe(v.string(), v.trim(), v.nonEmpty('Indicá el transportista')),
	numero_guia: v.optional(v.pipe(v.string(), v.trim())),
	cantidad_bultos: v.optional(v.number(), 1),
	observaciones: v.optional(v.pipe(v.string(), v.trim()))
});

async function transportistaPorNombre(nombre: string) {
	const [existente] = await db
		.select({ id: transportistas.id, activo: transportistas.activo })
		.from(transportistas)
		.where(sql`lower(${transportistas.nombre}) = lower(${nombre})`)
		.limit(1);
	if (existente) {
		if (!existente.activo) {
			await db
				.update(transportistas)
				.set({ activo: true })
				.where(eq(transportistas.id, existente.id));
		}
		return existente.id;
	}
	const [nuevo] = await db
		.insert(transportistas)
		.values({ nombre })
		.returning({ id: transportistas.id });
	getTransportistas().refresh();
	return nuevo.id;
}

const refrescarCachesEnvio = async (pedidoId?: number) => {
	await Promise.all([
		getEnvios({ page: 1 }).refresh(),
		...(pedidoId ? [getEnviosByPedido(pedidoId).refresh()] : [])
	]);
};

export const crearEnvio = form(EnvioSchema, async (data) => {
	const user = await requirePermission('envios', 'edit');
	await db.insert(envios).values({
		pedido_id: data.pedido_id,
		transportista_id: await transportistaPorNombre(data.transportista),
		numero_guia: data.numero_guia || null,
		cantidad_bultos: data.cantidad_bultos,
		observaciones: data.observaciones || null,
		fecha_envio: new Date(),
		estado: 'despachado'
	});

	await avisarEnvio(data.pedido_id, false, user.id);
	await refrescarCachesEnvio(data.pedido_id);
	getHistorialPedido(data.pedido_id).refresh();

	return { success: true };
});

export const marcarEntregado = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (envioId) => {
		const user = await requirePermission('envios', 'edit');
		const [envio] = await db
			.select({ pedido_id: envios.pedido_id })
			.from(envios)
			.where(eq(envios.id, envioId))
			.limit(1);

		await db
			.update(envios)
			.set({ estado: 'entregado', fecha_entrega: new Date() })
			.where(eq(envios.id, envioId));

		if (envio?.pedido_id) await avisarEnvio(envio.pedido_id, true, user.id);
		await refrescarCachesEnvio(envio?.pedido_id);
		if (envio?.pedido_id) getHistorialPedido(envio.pedido_id).refresh();
		return { success: true };
	}
);
