import { query, command, form, requested } from '$app/server';
import * as v from 'valibot';
import { ProductoSchema, ProductoSchemaUpdate } from './productos.schema';
import {
	getCategoriasService,
	getCategoriasCompService,
	getMarcasService,
	getModelosService,
	getProductoByIdService,
	getProductoConRecetaService,
	getProductoInsumosService,
	getProductosCatalogo as getProductosCatalogoService,
	getProductosListado,
	getTiposUsoService,
	getTiposVehiculoService,
	crearProductoServicio,
	actualizarProductoServicio,
	eliminarProductoServicio,
	obtenerPrecioProducto,
	getAtributosCategoriaService
} from '$lib/modulos/productos/productos.server';

import { requirePermission } from '$lib/server/auth/permissions';
import { toOptionalId } from '$lib/utils/ids';

const toOptionalNumber = toOptionalId;

const normalizarProductoPayload = <T extends Record<string, unknown>>(data: T) => ({
	...data,
	categoria_id: toOptionalNumber(data.categoria_id as string | number | null | undefined),
	margen_porcentaje: Number(data.margen_porcentaje ?? 0),
	tipo_vehiculo_id: toOptionalNumber(data.tipo_vehiculo_id as string | number | null | undefined),
	tipo_uso_id: toOptionalNumber(data.tipo_uso_id as string | number | null | undefined),
	categoria_competencia_id: toOptionalNumber(
		data.categoria_competencia_id as string | number | null | undefined
	),
	marca_id: toOptionalNumber(data.marca_id as string | number | null | undefined),
	modelo_id: toOptionalNumber(data.modelo_id as string | number | null | undefined)
});

export const getProductos = query(
	v.object({
		search: v.optional(v.string()),
		categoriaId: v.optional(v.number()),
		sort: v.optional(v.picklist(['nombre', 'codigo']), 'nombre'),
		direction: v.optional(v.picklist(['asc', 'desc']), 'asc'),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20),
		incluirPrecios: v.optional(v.boolean(), true)
	}),
	async ({
		search,
		categoriaId,
		sort = 'nombre',
		direction = 'asc',
		page,
		limit,
		incluirPrecios
	}) => {
		return getProductosListado({
			search,
			categoriaId,
			sort,
			direction,
			page,
			limit,
			incluirPrecios
		});
	}
);

export const getProductosCatalogo = query(
	v.object({
		search: v.optional(v.string()),
		categoriaId: v.optional(v.number()),
		sort: v.optional(v.picklist(['nombre', 'codigo']), 'nombre'),
		direction: v.optional(v.picklist(['asc', 'desc']), 'asc'),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ search, categoriaId, sort = 'nombre', direction = 'asc', page, limit }) => {
		return getProductosCatalogoService({ search, categoriaId, sort, direction, page, limit });
	}
);

export const getProductoById = query(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		return getProductoByIdService(id);
	}
);

export const getProductoPrecio = query(v.number(), async (productoId) => {
	return obtenerPrecioProducto(productoId);
});

export const getProductoInsumos = query(v.number(), async (productoId) => {
	return getProductoInsumosService(productoId);
});

export const getProductoConReceta = query(v.number(), async (productoId) => {
	return getProductoConRecetaService(productoId);
});

export const getCategorias = query(async () => {
	return getCategoriasService();
});

export const crearProducto = form(ProductoSchema, async (data) => {
	const result = await crearProductoServicio({
		...normalizarProductoPayload(data),
		receta: data.receta
	});

	await requested(getProductos, 1).refreshAll();
	return result;
});

export const actualizarProducto = form(ProductoSchemaUpdate, async (data) => {
	const result = await actualizarProductoServicio({
		...normalizarProductoPayload(data),
		receta: data.receta
	});

	await requested(getProductos, 1).refreshAll();
	getProductoInsumos(Number(data.id)).refresh();
	return result;
});

export const eliminarProducto = command(v.number(), async (id) => {
	const result = await eliminarProductoServicio(id);
	await requested(getProductos, 1).refreshAll();
	return result;
});

export const getTiposUso = query(async () => {
	return getTiposUsoService();
});

export const getTiposVehiculo = query(async () => {
	return getTiposVehiculoService();
});

export const getCategoriasComp = query(v.nullish(v.number()), async (tipoVehiculoId) => {
	if (tipoVehiculoId == null) return [];
	return getCategoriasCompService(tipoVehiculoId);
});

export const getMarcas = query(async () => {
	return getMarcasService();
});

export const getModelos = query(v.number(), async (marcaId) => {
	return getModelosService(marcaId);
});

export const getAtributosCategoria = query(v.nullish(v.number()), async (categoriaId) => {
	await requirePermission('productos', 'view');
	return getAtributosCategoriaService(categoriaId);
});
