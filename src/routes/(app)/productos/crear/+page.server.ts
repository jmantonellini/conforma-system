import {
	getCategorias,
	getMarcas,
	getTiposUso,
	getTiposVehiculo
} from '$lib/remote/productos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [categorias, marcas, tiposDeUso, tiposVehiculo] = await Promise.all([
		getCategorias(),
		getMarcas(),
		getTiposUso(),
		getTiposVehiculo()
	]);

	return { categorias, marcas, tiposDeUso, tiposVehiculo };
};
