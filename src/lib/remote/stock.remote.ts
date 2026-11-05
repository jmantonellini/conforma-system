import * as v from 'valibot';
import { command, query } from '$app/server';
import { requirePermission } from '$lib/server/auth/permissions';
import {
	registrarMovimientoStockServicio,
	obtenerStockDisponibilidadService
} from '$lib/server/services/stock.service';
import { TIPOS_MOVIMIENTO_STOCK } from '$lib/types/stock';
import { getCurrentUser } from './usuarios.remote';

export const getStockDisponibilidad = query(async () => {
	await requirePermission('stock', 'view');
	return obtenerStockDisponibilidadService();
});

export const registrarMovimientoStock = command(
	v.object({
		tipo: v.picklist(TIPOS_MOVIMIENTO_STOCK.map(({ value }) => value)),
		producto_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
		cantidad: v.pipe(v.number(), v.integer(), v.minValue(1)),
		distribuidor_id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
		observaciones: v.optional(v.string())
	}),
	async (data) => {
		await requirePermission('stock', 'edit');
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const movimiento = await registrarMovimientoStockServicio({
			tipo: data.tipo,
			productoId: data.producto_id,
			cantidad: data.cantidad,
			distribuidorId: data.distribuidor_id,
			usuarioId: user.id,
			observaciones: data.observaciones
		});
		getStockDisponibilidad().refresh();
		return { success: true, movimiento };
	}
);
