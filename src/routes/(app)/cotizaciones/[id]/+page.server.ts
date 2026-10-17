import { error } from '@sveltejs/kit';
import {
	getCotizacionById,
	getHistorialCotizacion,
	getNotasCotizacion
} from '$lib/remote/cotizaciones-consultas.remote';
import { getProductos } from '$lib/remote/productos.remote';
import {
	getCategoriasInsumo,
	getInsumos,
	getTiposInsumo,
	getUnidadesInsumo
} from '$lib/remote/insumos.remote';
import { getEmpleados } from '$lib/remote/empleados.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Cotización no encontrada');
	const { cotizacion, lineas, adjuntos } = await getCotizacionById(id);
	const [historial, notas, empleados] = await Promise.all([
		getHistorialCotizacion(id),
		getNotasCotizacion(id),
		getEmpleados()
	]);
	const [productos, insumos, tiposInsumo, categoriasInsumo, unidadesInsumo] = await Promise.all([
		getProductos({ limit: 100 }),
		getInsumos({ limit: 100 }),
		getTiposInsumo(),
		getCategoriasInsumo(),
		getUnidadesInsumo()
	]);
	return {
		cotizacion,
		lineas,
		adjuntos,
		historial,
		notas,
		empleados,
		productos: productos.data,
		insumos: insumos.data,
		tiposInsumo,
		categoriasInsumo,
		unidadesInsumo
	};
};
