import {
	getCategorias,
	getMarcas,
	getProductoById,
	getProductoConReceta,
	getProductos,
	getTiposUso,
	getTiposVehiculo
} from '$lib/remote/productos.remote';
import { getInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const producto = await getProductoById(params.id);
	const [recetaData, insumos, productos, categorias, marcas, tiposDeUso, tiposVehiculo] =
		await Promise.all([
			getProductoConReceta(producto.id),
			getInsumos({ limit: 100 }),
			getProductos({ limit: 100 }),
			getCategorias(),
			getMarcas(),
			getTiposUso(),
			getTiposVehiculo()
		]);
	return {
		producto,
		receta: recetaData.recetaDirecta,
		insumos: insumos.data,
		productos: productos.data,
		categorias,
		marcas,
		tiposDeUso,
		tiposVehiculo
	};
};
