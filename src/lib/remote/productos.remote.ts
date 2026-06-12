import { query, command, form, getRequestEvent } from '$app/server';
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
import { eq, count, and, like } from 'drizzle-orm';
import * as v from 'valibot';

// Schema base
const ProductoSchema = v.object({
	codigo: v.pipe(v.string(), v.nonEmpty('Código requerido')),
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	categoria_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	precio_base: v.nullable(v.number(), 0),
	medidas_primario_diametro: v.nullable(v.number()),
	medidas_primario_largo: v.nullable(v.number()),
	medidas_secundario_diametro: v.nullable(v.number()),
	medidas_secundario_largo: v.nullable(v.number()),
	trombon_diametro_inicial: v.nullable(v.number()),
	trombon_largo: v.nullable(v.number()),
	trombon_observaciones: v.optional(v.string()),
	es_personalizable: v.optional(v.boolean(), false),
	tipo_vehiculo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	tipo_uso_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	categoria_competencia_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	marca_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	modelo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number()))
});

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

		let where = undefined;
		if (search && categoriaId) {
			where = and(like(productos.nombre, `%${search}%`), eq(productos.categoria_id, categoriaId));
		} else if (search) {
			where = like(productos.nombre, `%${search}%`);
		} else if (categoriaId) {
			where = eq(productos.categoria_id, categoriaId);
		}

		const data = await db
			.select()
			.from(productos)
			.where(where)
			.orderBy(productos.nombre)
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db.select({ count: count() }).from(productos).where(where);

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
			categoria_id: data.categoria_id || null,
			created_at: new Date(),
			updated_at: new Date()
		})
		.returning();

	return { success: true, producto };
});

// productos.remote.ts
export const actualizarProducto = form(
	v.object({
		id: v.pipe(v.string(), v.transform(Number), v.number()),
		...ProductoSchema.entries
	}),
	async (data) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const { id, ...updateData } = data;

		const [producto] = await db
			.update(productos)
			.set({
				...updateData,
				updated_at: new Date()
			})
			.where(eq(productos.id, id))
			.returning();

		return { success: true, producto };
	}
);

// Command: eliminar producto
export const eliminarProducto = command(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	await db.delete(productos).where(eq(productos.id, id));
	getProductos({ search: '', page: 1 }).refresh();
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

export const getCategoriasComp = query(v.number(), async (tipoUsoId) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db
		.select()
		.from(categorias_competencia)
		.where(eq(categorias_competencia.tipo_uso_id, tipoUsoId))
		.orderBy(categorias_competencia.nombre);
});

export const getMarcas = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(marcas).orderBy(marcas.nombre);
});

export const getModelos = query(v.number(), async (marcaId) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db.select().from(modelos).where(eq(modelos.marca_id, marcaId));
});
