import { getProductoById } from '$lib/remote/productos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const producto = await getProductoById(params.id);
	
	return { producto };
};
