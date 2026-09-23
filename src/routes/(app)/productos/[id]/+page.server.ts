import { getProductoById, getProductoConReceta, getProductos } from '$lib/remote/productos.remote';
import { getInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const producto = await getProductoById(params.id);
	const [recetaData, insumos, productos] = await Promise.all([
		getProductoConReceta(producto.id),
		getInsumos({ limit: 100 }),
		getProductos({ limit: 100 })
	]);
	return { producto, receta: recetaData.receta, insumos: insumos.data, productos: productos.data };
};
