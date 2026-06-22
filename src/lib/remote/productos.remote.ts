import { query, command, form, getRequestEvent, requested } from '$app/server';
import { getDb } from '$lib/server/db';
import {
	productos,
	categorias_productos,
	tipos_uso,
	categorias_competencia,
	marcas,
	tipos_vehiculo,
	modelos
} from '$lib/server/db/schema';
import { eq, count, and, like, or } from 'drizzle-orm';
import * as v from 'valibot';
import { ProductoSchema, ProductoSchemaUpdate } from './productos.schema';

// Query: productos con paginación
export const getProductos = query(
	v.object({
		search: v.optional(v.string()),
		categoriaId: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({ search, categoriaId, page, limit }) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const offset = (page - 1) * limit;

		const conditions = [];

		if (search) {
			const searchTerm = `%${search}%`;
			conditions.push(
				or(
					like(productos.nombre, searchTerm),
					like(productos.codigo, searchTerm),
					like(marcas.nombre, searchTerm),
					like(modelos.nombre, searchTerm)
				)
			);
		}

		if (categoriaId) {
			conditions.push(eq(productos.categoria_id, categoriaId));
		}

		const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
		const data = await db
			.select({
				id: productos.id,
				codigo: productos.codigo,
				nombre: productos.nombre,
				categoria_id: productos.categoria_id,
				precio_base: productos.precio_base,
				marca: {
					id: marcas.id,
					nombre: marcas.nombre
				},
				modelo: {
					id: modelos.id,
					nombre: modelos.nombre
				}
			})
			.from(productos)
			.leftJoin(marcas, eq(productos.marca_id, marcas.id))
			.leftJoin(modelos, eq(productos.modelo_id, modelos.id))
			.where(whereCondition)
			.orderBy(productos.nombre)
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({ count: count() })
			.from(productos)
			.leftJoin(marcas, eq(productos.marca_id, marcas.id))
			.leftJoin(modelos, eq(productos.modelo_id, modelos.id))
			.where(whereCondition);

		return {
			data,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

// productos.remote.ts - agrega esta query
export const getProductoById = query(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		const producto = await db.select().from(productos).where(eq(productos.id, id)).get();

		if (!producto) {
			throw new Error('Producto no encontrado');
		}

		return producto;
	}
);

// Query: categorías
export const getCategorias = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(categorias_productos).orderBy(categorias_productos.nombre);
});

// Form: crear producto
export const crearProducto = form(ProductoSchema, async (data) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	const [producto] = await db
		.insert(productos)
		.values({
			...data,
			created_at: new Date(),
			updated_at: new Date()
		})
		.returning();

	getProductos({}).refresh();

	return { success: true, producto };
});

export const actualizarProducto = form(ProductoSchemaUpdate, async (data) => {
	console.log('ATUALIZAR ATUALIZAR ACTUALZIAR', data);

	const db = getDb(getRequestEvent().platform?.env?.DB);
	const { id, ...updateData } = data;

	const [producto] = await db
		.update(productos)
		.set({
			...updateData,
			updated_at: new Date()
		})
		.where(eq(productos.id, Number(id)))
		.returning();

	getProductos({}).refresh();
	return { success: true, producto };
});

// Command: eliminar producto
export const eliminarProducto = command(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	await db.delete(productos).where(eq(productos.id, id));
	await requested(getProductos, 1).refreshAll();
	return { success: true };
});

export const getTiposUso = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(tipos_uso).orderBy(tipos_uso.nombre);
});

export const getTiposVehiculo = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(tipos_vehiculo).orderBy(tipos_vehiculo.nombre);
});

export const getCategoriasComp = query(v.nullish(v.number()), async (tipoVehiculoId) => {
	console.log('GET CATEOGIRAAAAAAAAA', tipoVehiculoId);
	if (!tipoVehiculoId || isNaN(tipoVehiculoId) || tipoVehiculoId === 0) {
		return [];
	}

	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db
		.select()
		.from(categorias_competencia)
		.where(eq(categorias_competencia.tipo_vehiculo_id, tipoVehiculoId))
		.orderBy(categorias_competencia.nombre);
});

export const getMarcas = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(marcas).orderBy(marcas.nombre);
});

export const getModelos = query(v.number(), async (marcaId) => {
	console.log('GET MODELOS', marcaId);

	const db = getDb(getRequestEvent().platform?.env?.DB);
	const data = await db.select().from(modelos).where(eq(modelos.marca_id, marcaId));
	console.log('DATA', data);

	return data;
});
