import { getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import { productos } from '$lib/server/db/schema';

export const getProductos = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	return await db
		.select({
			id: productos.id,
			codigo: productos.codigo,
			nombre: productos.nombre,
			precio_base: productos.precio_base
		})
		.from(productos)
		.orderBy(productos.nombre);
});
