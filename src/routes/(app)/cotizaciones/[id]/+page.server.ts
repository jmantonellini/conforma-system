import {
	getCotizacionById,
	getHistorialCotizacion,
	getNotasCotizacion
} from '$lib/remote/cotizaciones-consultas.remote';
import { getProductoConReceta, getProductos } from '$lib/remote/productos.remote';
import { getInsumos } from '$lib/remote/insumos.remote';
import { getEmpleados } from '$lib/remote/empleados.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const { cotizacion, lineas, adjuntos } = await getCotizacionById(id);
	const [historial, notas, empleados] = await Promise.all([
		getHistorialCotizacion(id),
		getNotasCotizacion(id),
		getEmpleados()
	]);
	const productos = await getProductos({ limit: 100 });
	const insumos = await getInsumos({ limit: 100 });
	const productosConReceta = await Promise.all(
		productos.data.map(async (producto) => ({
			...producto,
			receta: (await getProductoConReceta(producto.id)).receta
		}))
	);
	return {
		cotizacion,
		lineas,
		adjuntos,
		historial,
		notas,
		empleados,
		productos: productosConReceta,
		insumos: insumos.data
	};
};
