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
	getProductosListado,
	getTiposUsoService,
	getTiposVehiculoService,
	crearProductoServicio,
	actualizarProductoServicio,
	eliminarProductoServicio
} from '$lib/server/services/productos.service';

const toOptionalNumber = (value: string | number | null | undefined) => {
	if (value === null || value === undefined || value === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizarProductoPayload = <T extends Record<string, unknown>>(data: T) => ({
	...data,
	categoria_id: toOptionalNumber(data.categoria_id as string | number | null | undefined),
	precio_base: (data.precio_base as number | undefined) ?? 0,
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
		sort: v.optional(v.picklist(['nombre', 'codigo', 'precio_base']), 'nombre'),
		direction: v.optional(v.picklist(['asc', 'desc']), 'asc'),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({ search, categoriaId, sort = 'nombre', direction = 'asc', page, limit }) => {
		return getProductosListado({ search, categoriaId, sort, direction, page, limit });
	}
);

export const getProductoById = query(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		return getProductoByIdService(id);
	}
);

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

	getProductos({}).refresh();
	return result;
});

export const actualizarProducto = form(ProductoSchemaUpdate, async (data) => {
	const result = await actualizarProductoServicio({
		...normalizarProductoPayload(data),
		receta: data.receta
	});

	getProductos({}).refresh();
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
