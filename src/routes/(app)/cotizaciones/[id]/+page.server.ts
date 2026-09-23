import { getCotizacionById, getHistorialCotizacion } from '$lib/remote/cotizaciones.remote';
import { getProductoConReceta, getProductos } from '$lib/remote/productos.remote';
import { getInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const { cotizacion, lineas, adjuntos } = await getCotizacionById(id);
	const historial = await getHistorialCotizacion(id);
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
		productos: productosConReceta,
		insumos: insumos.data
	};
};
