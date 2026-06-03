import { eq, desc } from 'drizzle-orm';
import type { DrizzleClient } from '$lib/server/db';
import {
	pedidos,
	lineas_pedido,
	clientes,
	estados_pedido,
	logs_estados_pedido
} from '$lib/server/db/schema';

export type PedidoInput = {
	cliente_id: number;
	fecha_pedido: Date;
	fecha_entrega_prometida?: Date;
	observaciones?: string;
	lineas: Array<{
		producto_id?: number;
		es_personalizado: boolean;
		descripcion_personalizada?: string;
		cantidad: number;
		precio_unitario: number;
		medidas_primario_diametro?: number;
		medidas_primario_largo?: number;
		medidas_secundario_diametro?: number;
		medidas_secundario_largo?: number;
		trombon_diametro_inicial?: number;
		trombon_largo?: number;
		trombon_observaciones?: string;
	}>;
};

export type LineaPedidoPlana = {
	id: number;
	producto_id: number | null;
	producto_codigo: string | null;
	producto_nombre: string | null;
	es_personalizado: boolean | null;
	descripcion_personalizada: string | null;
	cantidad: number;
	precio_unitario: number | null;
	subtotal: number | null;
	medidas_primario_diametro: number | null;
	medidas_primario_largo: number | null;
	medidas_secundario_diametro: number | null;
	medidas_secundario_largo: number | null;
	trombon_diametro_inicial: number | null;
	trombon_largo: number | null;
	trombon_observaciones: string | null;
};

export type PedidoPlano = {
	id: number;
	numero_pedido: string;
	cliente_id: number | null;
	cliente_nombre: string | null;
	fecha_pedido: Date | null;
	fecha_entrega_prometida: Date | null;
	fecha_entrega_real: Date | null;
	estado_id: number;
	estado_nombre: string | null;
	estado_color: string | null;
	precio_total: number | null;
	seña: number | null;
	saldo_pendiente: number | null;
	observaciones: string | null;
	lineas: LineaPedidoPlana[];
};

export async function getPedidos(db: DrizzleClient, page = 1, limit = 10, estadoId?: number) {
	const offset = (page - 1) * limit;

	let query = db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_nombre: clientes.nombre,
			fecha_pedido: pedidos.fecha_pedido,
			precio_total: pedidos.precio_total,
			estado_id: pedidos.estado_id,
			estado_nombre: estados_pedido.nombre,
			estado_color: estados_pedido.color
		})
		.from(pedidos)
		.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.orderBy(desc(pedidos.created_at))
		.$dynamic();

	if (estadoId) {
		query = query.where(eq(pedidos.estado_id, estadoId));
	}

	const data = await query.limit(limit).offset(offset);
	const totalResult = await query;

	const estados = await db.select().from(estados_pedido).orderBy(estados_pedido.orden);

	return {
		data,
		estados,
		total: totalResult.length,
		page,
		totalPages: Math.ceil(totalResult.length / limit)
	};
}

export async function getPedidoById(db: DrizzleClient, id: number) {
	// Solo el pedido, sin líneas por ahora
	const pedido = await db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_id: pedidos.cliente_id,
			cliente_nombre: clientes.nombre,
			fecha_pedido: pedidos.fecha_pedido,
			fecha_entrega_prometida: pedidos.fecha_entrega_prometida,
			precio_total: pedidos.precio_total,
			estado_id: pedidos.estado_id,
			observaciones: pedidos.observaciones
		})
		.from(pedidos)
		.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		.where(eq(pedidos.id, id))
		.get();

	return pedido;
}

export async function createPedido(db: DrizzleClient, data: PedidoInput) {
	const numero_pedido = `P-${Date.now()}`;
	let precio_total = 0;

	for (const linea of data.lineas) {
		precio_total += linea.cantidad * linea.precio_unitario;
	}

	const [pedido] = await db
		.insert(pedidos)
		.values({
			numero_pedido: numero_pedido,
			cliente_id: data.cliente_id,
			fecha_pedido: data.fecha_pedido,
			fecha_entrega_prometida: data.fecha_entrega_prometida,
			estado_id: 1,
			precio_total,
			saldo_pendiente: precio_total,
			observaciones: data.observaciones
		})
		.returning();

	for (const linea of data.lineas) {
		await db.insert(lineas_pedido).values({
			pedido_id: pedido.id,
			producto_id: linea.producto_id,
			es_personalizado: linea.es_personalizado,
			descripcion_personalizada: linea.descripcion_personalizada,
			cantidad: linea.cantidad,
			precio_unitario: linea.precio_unitario,
			medidas_primario_diametro: linea.medidas_primario_diametro,
			medidas_primario_largo: linea.medidas_primario_largo,
			medidas_secundario_diametro: linea.medidas_secundario_diametro,
			medidas_secundario_largo: linea.medidas_secundario_largo,
			trombon_diametro_inicial: linea.trombon_diametro_inicial,
			trombon_largo: linea.trombon_largo,
			trombon_observaciones: linea.trombon_observaciones
		});
	}

	return pedido;
}

export async function updatePedidoEstado(
	db: DrizzleClient,
	id: number,
	estadoId: number,
	usuarioId: number
) {
	const pedidoActual = await db
		.select({ estado_id: pedidos.estado_id })
		.from(pedidos)
		.where(eq(pedidos.id, id))
		.get();

	await db.update(pedidos).set({ estado_id: estadoId }).where(eq(pedidos.id, id));

	await db.insert(logs_estados_pedido).values({
		pedido_id: id,
		usuario_id: usuarioId,
		estado_anterior_id: pedidoActual?.estado_id,
		estado_nuevo_id: estadoId
	});

	return { success: true };
}
