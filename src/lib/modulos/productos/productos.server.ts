import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	productos,
	adjuntos,
	categorias_productos,
	tipos_uso,
	categorias_competencia,
	marcas,
	tipos_vehiculo,
	modelos,
	insumos,
	producto_insumos,
	producto_componentes,
	atributos_categoria,
	unidadInsumo,
	tipoInsumo
} from '$lib/server/db/schema';
import {
	eq,
	count,
	and,
	asc,
	desc,
	gte,
	ilike,
	isNotNull,
	isNull,
	lte,
	or,
	sql
} from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';
import {
	parsearRecetaProducto,
	sincronizarRecetaProducto,
	validarComponentes
} from '$lib/modulos/productos/receta.server';
import { generarCodigoProductoUnico } from '$lib/modulos/productos/codigo.server';
import { calcularPrecioVenta, redondearPrecio } from '$lib/utils/precios';
import { limpiarValores } from './atributos';
import { anioDeBusqueda } from './anios';
import type { DatosProducto, DatosProductoActualizado } from './productos.schema';

export async function calcularCostoMaterialesProducto(
	productoId: number,
	productosVisitados = new Set<number>()
): Promise<number> {
	if (productosVisitados.has(productoId)) {
		error(400, 'La receta contiene un ciclo de productos');
	}
	const siguientes = new Set(productosVisitados).add(productoId);
	const [materiales, componentes] = await Promise.all([
		db
			.select({ cantidad: producto_insumos.cantidad, costo_unitario: insumos.costo_unitario })
			.from(producto_insumos)
			.innerJoin(insumos, eq(producto_insumos.insumo_id, insumos.id))
			.where(eq(producto_insumos.producto_id, productoId)),
		db
			.select({
				producto_id: producto_componentes.componente_id,
				cantidad: producto_componentes.cantidad
			})
			.from(producto_componentes)
			.where(eq(producto_componentes.producto_id, productoId))
	]);

	const costoDirecto = materiales.reduce(
		(total, material) => total + material.cantidad * (material.costo_unitario ?? 0),
		0
	);
	const costosComponentes = await Promise.all(
		componentes.map(
			async (componente) =>
				(await calcularCostoMaterialesProducto(componente.producto_id, siguientes)) *
				componente.cantidad
		)
	);
	return redondearPrecio(
		costoDirecto + costosComponentes.reduce((total, costo) => total + costo, 0)
	);
}

export async function obtenerPrecioProducto(productoId: number) {
	const [producto] = await db
		.select({ margen_porcentaje: productos.margen_porcentaje })
		.from(productos)
		.where(eq(productos.id, productoId))
		.limit(1);
	if (!producto) error(404, 'Producto no encontrado');
	const costo_materiales = await calcularCostoMaterialesProducto(productoId);
	const margen_porcentaje = Number(producto.margen_porcentaje ?? 0);
	return {
		costo_materiales,
		margen_porcentaje,
		precio_venta: calcularPrecioVenta(costo_materiales, margen_porcentaje)
	};
}

export async function getProductosCatalogo({
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
	sort?: 'nombre' | 'codigo';
	direction?: 'asc' | 'desc';
}) {
	const listado = await getProductosListado({
		search,
		categoriaId,
		page,
		limit,
		sort,
		direction,
		incluirPrecios: false
	});
	return {
		...listado,
		data: listado.data.map(
			({ costo_materiales: _costo, precio_venta: _precio, ...producto }) => producto
		)
	};
}

export const recetaPendiente = sql<boolean>`(
	not exists (select 1 from ${producto_insumos} where ${producto_insumos.producto_id} = ${productos.id})
	and not exists (select 1 from ${producto_componentes} where ${producto_componentes.producto_id} = ${productos.id})
)`;

function coincideAnio(anio: number | null) {
	if (anio === null) return undefined;
	return and(
		or(isNotNull(productos.anio_desde), isNotNull(productos.anio_hasta)),
		or(isNull(productos.anio_desde), lte(productos.anio_desde, anio)),
		or(isNull(productos.anio_hasta), gte(productos.anio_hasta, anio))
	);
}

export async function getProductosListado({
	search,
	categoriaId,
	page = 1,
	limit = 10,
	sort = 'nombre',
	direction = 'asc',
	incluirPrecios = true
}: {
	search?: string;
	categoriaId?: number;
	page?: number;
	limit?: number;
	sort?: 'nombre' | 'codigo';
	direction?: 'asc' | 'desc';
	incluirPrecios?: boolean;
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
				ilike(modelos.nombre, searchTerm),
				coincideAnio(anioDeBusqueda(search))
			)
		);
	}

	if (categoriaId) {
		conditions.push(eq(productos.categoria_id, categoriaId));
	}

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
	const columnaOrden = sort === 'codigo' ? productos.codigo : productos.nombre;
	const orden = direction === 'desc' ? desc(columnaOrden) : asc(columnaOrden);
	const data = await db
		.select({
			id: productos.id,
			codigo: productos.codigo,
			nombre: productos.nombre,
			categoria_id: productos.categoria_id,
			margen_porcentaje: productos.margen_porcentaje,
			anio_desde: productos.anio_desde,
			anio_hasta: productos.anio_hasta,
			receta_pendiente: recetaPendiente,
			portada_id: sql<number | null>`(
				select ${adjuntos.id} from ${adjuntos}
				where ${adjuntos.producto_id} = ${productos.id} and ${adjuntos.categoria} = 'portada'
				limit 1
			)`,
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
	const dataConPrecios = incluirPrecios
		? await Promise.all(
				data.map(async (producto) => {
					const costo_materiales = await calcularCostoMaterialesProducto(producto.id);
					return {
						...producto,
						costo_materiales,
						precio_venta: calcularPrecioVenta(costo_materiales, producto.margen_porcentaje ?? 0)
					};
				})
			)
		: data.map((producto) => ({
				...producto,
				costo_materiales: 0,
				precio_venta: 0
			}));
	const [totalResult] = await db
		.select({ count: count() })
		.from(productos)
		.leftJoin(marcas, eq(productos.marca_id, marcas.id))
		.leftJoin(modelos, eq(productos.modelo_id, modelos.id))
		.where(whereCondition);

	return {
		data: dataConPrecios,
		total: totalResult?.count || 0,
		totalPages: Math.ceil((totalResult?.count || 0) / limit),
		currentPage: page
	};
}

export async function getProductoByIdService(id: number) {
	const [producto] = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
	if (!producto) error(404, 'Producto no encontrado');
	const [costo_materiales, archivos, atributosCategoria] = await Promise.all([
		calcularCostoMaterialesProducto(id),
		db
			.select({
				id: adjuntos.id,
				nombre_original: adjuntos.nombre_original,
				mime_type: adjuntos.mime_type,
				categoria: adjuntos.categoria,
				tamano_bytes: adjuntos.tamano_bytes,
				created_at: adjuntos.created_at
			})
			.from(adjuntos)
			.where(eq(adjuntos.producto_id, id))
			.orderBy(adjuntos.id),
		getAtributosCategoriaService(producto.categoria_id)
	]);
	return {
		...producto,
		atributos_categoria: atributosCategoria,
		costo_materiales,
		precio_venta: calcularPrecioVenta(costo_materiales, producto.margen_porcentaje ?? 0),
		adjuntos: archivos.map((archivo) => ({
			...archivo,
			propietario: { tipo: 'producto' as const, id }
		}))
	};
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
			unidad: unidadInsumo,
			costo_unitario: insumos.costo_unitario,
			tipo: tipoInsumo
		})
		.from(producto_insumos)
		.innerJoin(insumos, eq(producto_insumos.insumo_id, insumos.id))
		.where(eq(producto_insumos.producto_id, productoId))
		.orderBy(producto_insumos.orden);
}

export async function getProductoConRecetaService(productoId: number) {
	const [producto] = await db.select().from(productos).where(eq(productos.id, productoId)).limit(1);
	if (!producto) error(404, 'Producto no encontrado');
	const costo_materiales = await calcularCostoMaterialesProducto(productoId);

	const [receta, componentes] = await Promise.all([
		db
			.select({
				id: producto_insumos.id,
				insumo_id: producto_insumos.insumo_id,
				cantidad: producto_insumos.cantidad,
				orden: producto_insumos.orden,
				codigo: insumos.codigo,
				nombre: insumos.nombre,
				unidad: unidadInsumo,
				costo_unitario: insumos.costo_unitario,
				tipo: tipoInsumo
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
				codigo: productos.codigo,
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
		if (visitados.has(id)) error(400, 'La receta contiene un ciclo de productos');
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
					unidad: unidadInsumo,
					costo_unitario: insumos.costo_unitario,
					tipo: tipoInsumo
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

	const recetaDirecta = [
		...receta.map((linea) => ({
			insumo_id: linea.insumo_id,
			producto_id: undefined,
			codigo: linea.codigo,
			nombre: linea.nombre,
			cantidad: linea.cantidad,
			orden: linea.orden
		})),
		...componentes.map((linea) => ({
			insumo_id: undefined,
			producto_id: linea.componente_id,
			codigo: linea.codigo,
			nombre: linea.nombre,
			cantidad: linea.cantidad,
			orden: linea.orden
		}))
	].sort((a, b) => a.orden - b.orden);

	return {
		producto: {
			...producto,
			costo_materiales,
			precio_venta: calcularPrecioVenta(costo_materiales, producto.margen_porcentaje ?? 0)
		},
		receta: await expandir(productoId, 1),
		recetaDirecta,
		componentes
	};
}

export async function crearProductoServicio(data: DatosProducto) {
	await requirePermission('productos', 'create');
	const { receta: recetaJson, codigo: codigoOriginal, atributos, ...productoData } = data;
	const definiciones = await getAtributosCategoriaService(productoData.categoria_id);
	const codigo =
		(codigoOriginal ?? '').trim() || (await generarCodigoProductoUnico(productoData.nombre));
	const receta = parsearRecetaProducto(recetaJson);

	const [producto] = await db
		.insert(productos)
		.values({
			...productoData,
			atributos: limpiarValores(atributos ?? {}, definiciones),
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

export async function actualizarProductoServicio(data: DatosProductoActualizado) {
	await requirePermission('productos', 'edit');
	const { id, receta: recetaJson, atributos, ...updateData } = data;
	const receta = recetaJson ? parsearRecetaProducto(recetaJson) : undefined;
	const definiciones = await getAtributosCategoriaService(updateData.categoria_id);

	const producto = await db.transaction(async (tx) => {
		const [actualizado] = await tx
			.update(productos)
			.set({
				...updateData,
				anio_desde: updateData.anio_desde ?? null,
				anio_hasta: updateData.anio_hasta ?? null,
				...(atributos && { atributos: limpiarValores(atributos, definiciones) }),
				updated_at: new Date()
			})
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

export async function getAtributosCategoriaService(categoriaId: number | null | undefined) {
	if (!categoriaId) return [];
	return db
		.select({
			id: atributos_categoria.id,
			clave: atributos_categoria.clave,
			etiqueta: atributos_categoria.etiqueta,
			grupo: atributos_categoria.grupo,
			tipo: atributos_categoria.tipo,
			unidad: atributos_categoria.unidad,
			orden: atributos_categoria.orden
		})
		.from(atributos_categoria)
		.where(eq(atributos_categoria.categoria_id, categoriaId))
		.orderBy(asc(atributos_categoria.orden), asc(atributos_categoria.id));
}
