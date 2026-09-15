import { getProductoById, getProductoInsumos } from '$lib/remote/productos.remote';
import { getInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const producto = await getProductoById(params.id);
	const [receta, insumos] = await Promise.all([
		getProductoInsumos(producto.id),
		getInsumos({ limit: 100 })
	]);
	return { producto, receta, insumos: insumos.data };
};
