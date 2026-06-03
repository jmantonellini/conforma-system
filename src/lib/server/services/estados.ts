import type { DrizzleClient } from '$lib/server/db';
import { estados_pedido } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function getEstadosPedido(db: DrizzleClient) {
	return await db.select().from(estados_pedido).orderBy(estados_pedido.orden);
}

export async function getEstadoPedidoById(db: DrizzleClient, id: number) {
	return await db.select().from(estados_pedido).where(eq(estados_pedido.id, id)).get();
}
