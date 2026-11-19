import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { Tx } from '$lib/server/db';
import type { Ejecutor } from '$lib/server/estados';
import { contactos, pedidos } from '$lib/server/db/schema';
import {
	ENTREGA_VACIA,
	resolverEntrega,
	tieneDatosEntrega,
	type DatosEntrega
} from '$lib/modulos/ventas/trabajo';

export const columnasEntrega = (tabla: typeof pedidos | typeof contactos) => ({
	transportista: tabla.entrega_transportista,
	direccion: tabla.entrega_direccion,
	localidad: tabla.entrega_localidad,
	recibe: tabla.entrega_recibe,
	telefono: tabla.entrega_telefono
});

export const valoresEntrega = (entrega: Partial<DatosEntrega>) => ({
	entrega_transportista: entrega.transportista?.trim() || null,
	entrega_direccion: entrega.direccion?.trim() || null,
	entrega_localidad: entrega.localidad?.trim() || null,
	entrega_recibe: entrega.recibe?.trim() || null,
	entrega_telefono: entrega.telefono?.trim() || null
});

export async function entregaDelPedido(tx: Ejecutor, pedidoId: number) {
	const [fila] = await tx
		.select({
			contacto_id: pedidos.contacto_id,
			propia: columnasEntrega(pedidos),
			cliente: columnasEntrega(contactos)
		})
		.from(pedidos)
		.leftJoin(contactos, eq(contactos.id, pedidos.contacto_id))
		.where(eq(pedidos.id, pedidoId));
	if (!fila) error(404, 'Pedido no encontrado');
	return {
		contactoId: fila.contacto_id,
		...resolverEntrega(fila.propia ?? ENTREGA_VACIA, fila.cliente)
	};
}

export async function fijarEntregaDelCliente(tx: Tx, pedidoId: number) {
	const entrega = await entregaDelPedido(tx, pedidoId);
	if (entrega.origen !== 'cliente' || !tieneDatosEntrega(entrega.datos)) return;
	await tx.update(pedidos).set(valoresEntrega(entrega.datos)).where(eq(pedidos.id, pedidoId));
}
