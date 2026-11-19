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
	modalidad: tabla.entrega_modalidad,
	provincia: tabla.entrega_provincia,
	codigo_postal: tabla.entrega_codigo_postal,
	recibe: tabla.entrega_recibe,
	telefono: tabla.entrega_telefono,
	indicaciones: tabla.entrega_indicaciones,
	consumidor_final: tabla.entrega_consumidor_final
});

export const valoresEntrega = (entrega: Partial<DatosEntrega>) => ({
	entrega_transportista: entrega.transportista?.trim() || null,
	entrega_direccion: entrega.direccion?.trim() || null,
	entrega_localidad: entrega.localidad?.trim() || null,
	entrega_modalidad: entrega.modalidad || null,
	entrega_provincia: entrega.provincia?.trim() || null,
	entrega_codigo_postal: entrega.codigo_postal?.trim() || null,
	entrega_recibe: entrega.recibe?.trim() || null,
	entrega_telefono: entrega.telefono?.trim() || null,
	entrega_indicaciones: entrega.indicaciones?.trim() || null,
	entrega_consumidor_final: entrega.consumidor_final ?? false
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
