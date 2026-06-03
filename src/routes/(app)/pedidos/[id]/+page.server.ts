import { updatePedidoEstado } from '$lib/server/services/pedidos';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { clientes, lineas_pedido, pedidos, productos } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const id = parseInt(params.id);

	const pedido = await locals.db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_id: pedidos.cliente_id,
			cliente_nombre: clientes.nombre,
			fecha_pedido: pedidos.fecha_pedido,
			observaciones: pedidos.observaciones,
			precio_total: pedidos.precio_total
		})
		.from(pedidos)
		.leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
		.where(eq(pedidos.id, id))
		.get();

	const lineas = await locals.db
		.select({
			id: lineas_pedido.id,
			cantidad: lineas_pedido.cantidad,
			precio_unitario: lineas_pedido.precio_unitario,
			subtotal: lineas_pedido.subtotal,
			es_personalizado: lineas_pedido.es_personalizado,
			descripcion_personalizada: lineas_pedido.descripcion_personalizada,
			producto_id: lineas_pedido.producto_id,
			producto_codigo: productos.codigo,
			producto_nombre: productos.nombre
		})
		.from(lineas_pedido)
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.where(eq(lineas_pedido.pedido_id, id));

	return {
		pedido,
		lineas
	};
};

export const actions: Actions = {
	cambiarEstado: async ({ request, locals }) => {
		const formData = await request.formData();
		const pedidoId = parseInt(formData.get('pedidoId') as string);
		const nuevoEstadoId = parseInt(formData.get('estadoId') as string);
		const usuarioId = 1; // TODO: Obtener de locals.user

		await updatePedidoEstado(locals.db, pedidoId, nuevoEstadoId, usuarioId);

		return { success: true };
	},

	eliminar: async ({ request, locals }) => {
		const formData = await request.formData();
		const pedidoId = parseInt(formData.get('pedidoId') as string);

		await locals.db.delete(pedidos).where(eq(pedidos.id, pedidoId));

		throw redirect(303, resolve('/pedidos'));
	}
};
