import { query, command, form, requested } from '$app/server';
import { db } from '$lib/server/db';
import {
	productos,
	categorias_productos,
	tipos_uso,
	categorias_competencia,
	marcas,
	tipos_vehiculo,
	modelos,
	insumos,
	producto_insumos
} from '$lib/server/db/schema';
import { eq, count, and, ilike, or } from 'drizzle-orm';
import * as v from 'valibot';
import { ProductoSchema, ProductoSchemaUpdate } from './productos.schema';
import { requirePermission } from '$lib/server/auth/permissions';

// Query: productos con paginación
export const getProductos = query(
	v.object({
		search: v.optional(v.string()),
		categoriaId: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({ search, categoriaId, page, limit }) => {
		const offset = (page - 1) * limit;

		const conditions = [];

		if (search) {
			const searchTerm = `%${search}%`;
			conditions.push(
				or(
					ilike(productos.nombre, searchTerm),
					ilike(productos.codigo, searchTerm),
					ilike(marcas.nombre, searchTerm),
					ilike(modelos.nombre, searchTerm)
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
		const [producto] = await db.select().from(productos).where(eq(productos.id, id)).limit(1);

		if (!producto) {
			throw new Error('Producto no encontrado');
		}

		return producto;
	}
);

export const getProductoInsumos = query(v.number(), async (productoId) => {
	return await db
		.select({
			id: producto_insumos.id,
			insumo_id: producto_insumos.insumo_id,
			cantidad: producto_insumos.cantidad,
			orden: producto_insumos.orden,
			opcional: producto_insumos.opcional,
			codigo: insumos.codigo,
			nombre: insumos.nombre,
			unidad: insumos.unidad,
			costo_unitario: insumos.costo_unitario,
			tipo: insumos.tipo
		})
		.from(producto_insumos)
		.innerJoin(insumos, eq(producto_insumos.insumo_id, insumos.id))
		.where(eq(producto_insumos.producto_id, productoId))
		.orderBy(producto_insumos.orden);
});

// Query: categorías
export const getCategorias = query(async () => {
	return await db.select().from(categorias_productos).orderBy(categorias_productos.nombre);
});

// Form: crear producto
export const crearProducto = form(ProductoSchema, async (data) => {
	await requirePermission('productos', 'create');
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
	await requirePermission('productos', 'edit');
	const { id, receta: recetaJson, ...updateData } = data;
	let receta: { insumo_id: number; cantidad: number; opcional: boolean }[] | undefined;

	if (recetaJson) {
		try {
			const parsed = JSON.parse(recetaJson);
			if (!Array.isArray(parsed)) throw new Error();
			receta = parsed
				.filter((linea) => linea?.insumo_id)
				.map((linea) => ({
					insumo_id: Number(linea.insumo_id),
					cantidad: Number(linea.cantidad),
					opcional: Boolean(linea.opcional)
				}));
		} catch {
			throw new Error('La receta del producto no es válida');
		}
	}

	const producto = await db.transaction(async (tx) => {
		const [actualizado] = await tx
			.update(productos)
			.set({ ...updateData, updated_at: new Date() })
			.where(eq(productos.id, Number(id)))
			.returning();

		if (receta) {
			await tx.delete(producto_insumos).where(eq(producto_insumos.producto_id, Number(id)));
			if (receta.length) {
				await tx
					.insert(producto_insumos)
					.values(receta.map((linea, orden) => ({ ...linea, producto_id: Number(id), orden })));
			}
		}

		return actualizado;
	});

	getProductos({}).refresh();
	getProductoInsumos(Number(id)).refresh();
	return { success: true, producto };
});

// Command: eliminar producto
export const eliminarProducto = command(v.number(), async (id) => {
	await requirePermission('productos', 'delete');
	await db.delete(productos).where(eq(productos.id, id));
	await requested(getProductos, 1).refreshAll();
	return { success: true };
});

export const getTiposUso = query(async () => {
	return await db.select().from(tipos_uso).orderBy(tipos_uso.nombre);
});

export const getTiposVehiculo = query(async () => {
	return await db.select().from(tipos_vehiculo).orderBy(tipos_vehiculo.nombre);
});

export const getCategoriasComp = query(v.nullish(v.number()), async (tipoVehiculoId) => {
	if (!tipoVehiculoId || isNaN(tipoVehiculoId) || tipoVehiculoId === 0) {
		return [];
	}

	return await db
		.select()
		.from(categorias_competencia)
		.where(eq(categorias_competencia.tipo_vehiculo_id, tipoVehiculoId))
		.orderBy(categorias_competencia.nombre);
});

export const getMarcas = query(async () => {
	return await db.select().from(marcas).orderBy(marcas.nombre);
});

export const getModelos = query(v.number(), async (marcaId) => {
	const data = await db.select().from(modelos).where(eq(modelos.marca_id, marcaId));

	return data;
});
