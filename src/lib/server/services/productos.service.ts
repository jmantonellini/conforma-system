import * as v from 'valibot';
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
	producto_insumos,
	producto_componentes
} from '$lib/server/db/schema';
import { eq, count, and, asc, desc, ilike, or } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';
import {
	parsearRecetaProducto,
	sincronizarRecetaProducto,
	validarComponentes
} from '$lib/server/services/productos-receta.service';
import { generarCodigoProductoUnico } from '$lib/server/services/productos-codigo.service';

export const ProductoSchemaService = v.object({
	codigo: v.optional(v.pipe(v.string(), v.trim()), ''),
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	categoria_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	precio_base: v.optional(v.number(), 0),
	medidas_primario_diametro: v.optional(v.number()),
	medidas_primario_largo: v.optional(v.number()),
	medidas_secundario_diametro: v.optional(v.number()),
	medidas_secundario_largo: v.optional(v.number()),
	trombon_diametro_inicial: v.optional(v.number()),
	trombon_largo: v.optional(v.number()),
	trombon_observaciones: v.optional(v.string()),
	es_personalizable: v.optional(v.boolean(), false),
	tipo_vehiculo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	tipo_uso_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	categoria_competencia_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	marca_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	modelo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	receta: v.optional(v.string())
});

export const ProductoSchemaUpdateService = v.object({
	...ProductoSchemaService.entries,
	id: v.string(),
	codigo: v.optional(v.pipe(v.string(), v.trim()), ''),
	receta: v.optional(v.string())
});

export async function getProductosListado({
	search,
	categoriaId,
	page = 1,
	limit = 10,
	sort = 'nombre',
	direction = 'asc'
}: {
	search?: string;
	categoriaId?: number;
	page?: number;
	limit?: number;
	sort?: 'nombre' | 'codigo' | 'precio_base';
	direction?: 'asc' | 'desc';
}) {
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
	const columnaOrden = {
		nombre: productos.nombre,
		codigo: productos.codigo,
		precio_base: productos.precio_base
	}[sort];
	const orden = direction === 'desc' ? desc(columnaOrden) : asc(columnaOrden);
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
		.orderBy(orden)
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

export async function getProductoByIdService(id: number) {
	const [producto] = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
	if (!producto) throw new Error('Producto no encontrado');
	return producto;
}

export async function getProductoInsumosService(productoId: number) {
	return await db
		.select({
			id: producto_insumos.id,
			insumo_id: producto_insumos.insumo_id,
			cantidad: producto_insumos.cantidad,
			orden: producto_insumos.orden,
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
}

export async function getProductoConRecetaService(productoId: number) {
	const [producto] = await db.select().from(productos).where(eq(productos.id, productoId)).limit(1);
	if (!producto) throw new Error('Producto no encontrado');

	const [receta, componentes] = await Promise.all([
		db
			.select({
				id: producto_insumos.id,
				insumo_id: producto_insumos.insumo_id,
				cantidad: producto_insumos.cantidad,
				orden: producto_insumos.orden,
				codigo: insumos.codigo,
				nombre: insumos.nombre,
				unidad: insumos.unidad,
				costo_unitario: insumos.costo_unitario,
				tipo: insumos.tipo
			})
			.from(producto_insumos)
			.innerJoin(insumos, eq(producto_insumos.insumo_id, insumos.id))
			.where(eq(producto_insumos.producto_id, productoId))
			.orderBy(producto_insumos.orden),
		db
			.select({
				id: producto_componentes.id,
				componente_id: producto_componentes.componente_id,
				cantidad: producto_componentes.cantidad,
				orden: producto_componentes.orden,
				nombre: productos.nombre
			})
			.from(producto_componentes)
			.innerJoin(productos, eq(producto_componentes.componente_id, productos.id))
			.where(eq(producto_componentes.producto_id, productoId))
			.orderBy(producto_componentes.orden)
	]);

	const expandir = async (
		id: number,
		multiplicador: number,
		visitados = new Set<number>()
	): Promise<typeof receta> => {
		if (visitados.has(id)) throw new Error('La receta contiene un ciclo de productos');
		const siguiente = new Set(visitados).add(id);
		const [directos, hijos] = await Promise.all([
			db
				.select({
					id: producto_insumos.id,
					insumo_id: producto_insumos.insumo_id,
					cantidad: producto_insumos.cantidad,
					orden: producto_insumos.orden,
					codigo: insumos.codigo,
					nombre: insumos.nombre,
					unidad: insumos.unidad,
					costo_unitario: insumos.costo_unitario,
					tipo: insumos.tipo
				})
				.from(producto_insumos)
				.innerJoin(insumos, eq(producto_insumos.insumo_id, insumos.id))
				.where(eq(producto_insumos.producto_id, id))
				.orderBy(producto_insumos.orden),
			db
				.select({
					componente_id: producto_componentes.componente_id,
					cantidad: producto_componentes.cantidad
				})
				.from(producto_componentes)
				.where(eq(producto_componentes.producto_id, id))
				.orderBy(producto_componentes.orden)
		]);
		const resultado = directos.map((item) => ({
			...item,
			cantidad: item.cantidad * multiplicador
		}));
		for (const hijo of hijos) {
			resultado.push(
				...(await expandir(hijo.componente_id, hijo.cantidad * multiplicador, siguiente))
			);
		}
		return resultado;
	};

	return { producto, receta: await expandir(productoId, 1), componentes };
}

export async function crearProductoServicio(data: {
	codigo?: string;
	nombre: string;
	categoria_id?: number;
	precio_base?: number;
	medidas_primario_diametro?: number;
	medidas_primario_largo?: number;
	medidas_secundario_diametro?: number;
	medidas_secundario_largo?: number;
	trombon_diametro_inicial?: number;
	trombon_largo?: number;
	trombon_observaciones?: string;
	es_personalizable?: boolean;
	tipo_vehiculo_id?: number;
	tipo_uso_id?: number;
	categoria_competencia_id?: number;
	marca_id?: number;
	modelo_id?: number;
	receta?: string;
}) {
	await requirePermission('productos', 'create');
	const { receta: recetaJson, codigo: codigoOriginal, ...productoData } = data;
	const codigo =
		(codigoOriginal ?? '').trim() || (await generarCodigoProductoUnico(productoData.nombre));
	const receta = parsearRecetaProducto(recetaJson);

	const [producto] = await db
		.insert(productos)
		.values({
			...productoData,
			codigo,
			created_at: new Date(),
			updated_at: new Date()
		})
		.returning();

	const componentes = receta.filter((linea) => linea.producto_id) as {
		producto_id: number;
		cantidad: number;
	}[];
	validarComponentes(
		componentes.map((linea) => ({ componente_id: linea.producto_id })),
		producto.id
	);

	if (receta.filter((linea) => linea.insumo_id).length) {
		await db.insert(producto_insumos).values(
			receta
				.filter((linea) => linea.insumo_id)
				.map((linea, orden) => ({
					insumo_id: linea.insumo_id!,
					cantidad: linea.cantidad,
					producto_id: producto.id,
					orden
				}))
		);
	}

	if (componentes.length) {
		await db.insert(producto_componentes).values(
			componentes.map((linea, orden) => ({
				componente_id: linea.producto_id,
				cantidad: linea.cantidad,
				producto_id: producto.id,
				orden
			}))
		);
	}

	return { success: true, producto };
}

export async function actualizarProductoServicio(data: {
	id: string;
	codigo?: string;
	nombre?: string;
	categoria_id?: number;
	precio_base?: number;
	medidas_primario_diametro?: number;
	medidas_primario_largo?: number;
	medidas_secundario_diametro?: number;
	medidas_secundario_largo?: number;
	trombon_diametro_inicial?: number;
	trombon_largo?: number;
	trombon_observaciones?: string;
	es_personalizable?: boolean;
	tipo_vehiculo_id?: number;
	tipo_uso_id?: number;
	categoria_competencia_id?: number;
	marca_id?: number;
	modelo_id?: number;
	receta?: string;
}) {
	await requirePermission('productos', 'edit');
	const { id, receta: recetaJson, ...updateData } = data;
	const receta = recetaJson ? parsearRecetaProducto(recetaJson) : undefined;

	const producto = await db.transaction(async (tx) => {
		const [actualizado] = await tx
			.update(productos)
			.set({ ...updateData, updated_at: new Date() })
			.where(eq(productos.id, Number(id)))
			.returning();

		if (receta) {
			await sincronizarRecetaProducto({
				tx,
				productoId: Number(id),
				receta
			});
		}

		return actualizado;
	});

	return { success: true, producto };
}

export async function eliminarProductoServicio(id: number) {
	await requirePermission('productos', 'delete');
	await db.delete(productos).where(eq(productos.id, id));
	return { success: true };
}

export async function getTiposUsoService() {
	return await db.select().from(tipos_uso).orderBy(tipos_uso.nombre);
}

export async function getTiposVehiculoService() {
	return await db.select().from(tipos_vehiculo).orderBy(tipos_vehiculo.nombre);
}

export async function getCategoriasCompService(tipoVehiculoId?: number) {
	if (!tipoVehiculoId || isNaN(tipoVehiculoId) || tipoVehiculoId === 0) {
		return [];
	}

	return await db
		.select()
		.from(categorias_competencia)
		.where(eq(categorias_competencia.tipo_vehiculo_id, tipoVehiculoId))
		.orderBy(categorias_competencia.nombre);
}

export async function getMarcasService() {
	return await db.select().from(marcas).orderBy(marcas.nombre);
}

export async function getModelosService(marcaId: number) {
	return await db.select().from(modelos).where(eq(modelos.marca_id, marcaId));
}

export async function getCategoriasService() {
	return await db.select().from(categorias_productos).orderBy(categorias_productos.nombre);
}
