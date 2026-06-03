import { eq, ilike } from 'drizzle-orm';
import type { DrizzleClient } from '$lib/server/db';
import { productos, categorias_productos } from '$lib/server/db/schema';

export type ProductoInput = {
	codigo: string;
	nombre: string;
	categoria_id?: number;
	medidas_primario_diametro?: number;
	medidas_primario_largo?: number;
	medidas_secundario_diametro?: number;
	medidas_secundario_largo?: number;
	trombon_diametro_inicial?: number;
	trombon_largo?: number;
	trombon_observaciones?: string;
	precio_base?: number;
	es_personalizable?: boolean;
};

export async function getProductos(
	db: DrizzleClient,
	search?: string,
	categoriaId?: number,
	page = 1,
	limit = 10
) {
	const offset = (page - 1) * limit;

	let query = db.select().from(productos).$dynamic();

	if (search) {
		query = query.where(ilike(productos.nombre, `%${search}%`));
	}

	if (categoriaId) {
		query = query.where(eq(productos.categoria_id, categoriaId));
	}

	const data = await query.limit(limit).offset(offset);
	const totalResult = await query;

	const categorias = await db.select().from(categorias_productos);

	return {
		data,
		categorias,
		total: totalResult.length,
		page,
		totalPages: Math.ceil(totalResult.length / limit)
	};
}

export async function getProductosList(db: DrizzleClient) {
	return await db
		.select({
			id: productos.id,
			codigo: productos.codigo,
			nombre: productos.nombre,
			precio_base: productos.precio_base
		})
		.from(productos)
		.where(eq(productos.activo, true))
		.orderBy(productos.nombre);
}

export async function getProductoById(db: DrizzleClient, id: number) {
	return await db.select().from(productos).where(eq(productos.id, id)).get();
}

export async function createProducto(db: DrizzleClient, data: ProductoInput) {
	return await db.insert(productos).values(data).returning();
}

export async function updateProducto(db: DrizzleClient, id: number, data: Partial<ProductoInput>) {
	return await db.update(productos).set(data).where(eq(productos.id, id)).returning();
}

export async function deleteProducto(db: DrizzleClient, id: number) {
	return await db.delete(productos).where(eq(productos.id, id));
}
