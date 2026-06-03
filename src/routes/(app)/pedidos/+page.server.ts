import type { PageServerLoad, Actions } from './$types';
import { updatePedidoEstado } from '$lib/server/services/pedidos';
import { clientes, estados_pedido, pedidos } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Traer pedidos con nombre del cliente y estado
	const pedidosReturn = await locals.db
		.select({
			id: pedidos.id,
			numero_orden: pedidos.numero_pedido,
			// cliente: clientes.nombre,
			fecha: pedidos.fecha_pedido,
			total: pedidos.precio_total,
			// estado: estados_pedido.nombre,
			// estadoColor: estados_pedido.color,
			estadoId: pedidos.estado_id
		})
		.from(pedidos)
		// .leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		// .leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.orderBy(desc(pedidos.created_at));

	// Traer estados para el filtro
	const estados = await locals.db.select().from(estados_pedido).orderBy(estados_pedido.orden);
	console.log('PEDIDOS: ' + pedidosReturn);

	if (!pedidosReturn) {
		return { pedidos: [], estados: [] };
	}

	return { pedidos: pedidosReturn, estados };
};

export const actions: Actions = {
	cambiarEstado: async ({ request, locals }) => {
		const formData = await request.formData();
		const pedidoId = parseInt(formData.get('pedidoId') as string);
		const nuevoEstadoId = parseInt(formData.get('estadoId') as string);
		const usuarioId = 1; // TODO: Obtener de locals.user

		await updatePedidoEstado(locals.db, pedidoId, nuevoEstadoId, usuarioId);
		return { success: true };
	}
};
