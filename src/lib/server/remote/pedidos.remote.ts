import { z } from 'zod';
import { form, getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { pedidos, lineas_pedido, logs_pedidos } from '$lib/server/db/schema';
import { getCurrentUser } from './usuarios.remote';
import { redirect } from '@sveltejs/kit';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { resolve } from '$app/paths';

const LineaSchema = z.object({
	producto_id: z.string(),
	cantidad: z.number().min(1, 'Cantidad debe ser mayor a 0'),
	precio: z.number().min(0, 'Precio no puede ser negativo'),
	descripcion: z.string().optional()
});

const PedidoSchema = z.object({
	cliente_id: z.string().min(1, 'Cliente requerido'),
	lineas: z.array(LineaSchema).min(1, 'Al menos un producto'),
	fecha_entrega_prometida: z.string().optional(),
	seña: z.number().min(0).optional().default(0),
	observaciones: z.string().optional()
});

export const crearPedido = form(PedidoSchema, async (data) => {
	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);
	const user = await getCurrentUser();

	const numero_pedido = await generarNumeroPedido(db);

	if (!user) throw new Error('No autorizado');

	const precio_total = data.lineas.reduce((sum, l) => sum + l.cantidad * l.precio, 0);
	const saldo_pendiente = precio_total - data.seña;

	const [pedido] = await db
		.insert(pedidos)
		.values({
			cliente_id: parseInt(data.cliente_id),
			numero_pedido,
			fecha_pedido: new Date(),
			fecha_entrega_prometida: data.fecha_entrega_prometida
				? new Date(data.fecha_entrega_prometida)
				: null,
			estado_id: 1, // Asumiendo que 1 es el estado "Pendiente"
			precio_total,
			seña: data.seña,
			saldo_pendiente,
			observaciones: data.observaciones
		})
		.returning();

	for (const linea of data.lineas) {
		await db.insert(lineas_pedido).values({
			pedido_id: pedido.id,
			producto_id: linea.producto_id === 'personalizado' ? null : parseInt(linea.producto_id),
			cantidad: linea.cantidad,
			precio_unitario: linea.precio,
			es_personalizado: linea.producto_id === 'personalizado',
			descripcion_personalizada: linea.descripcion
		});
	}

	await db.insert(logs_pedidos).values({
		pedido_id: pedido.id,
		usuario_id: user.id,
		accion: 'crear',
		ip_address: event.getClientAddress(),
		user_agent: event.request.headers.get('user-agent') || undefined
	});

	redirect(303, resolve(`/pedidos/${pedido.id}`));
});
