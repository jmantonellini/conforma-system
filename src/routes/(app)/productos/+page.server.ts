import { getProductos } from '$lib/remote/productos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const search = url.searchParams.get('search') || undefined;
	const categoria = Number(url.searchParams.get('categoria')) || undefined;
	const page = Number(url.searchParams.get('page')) || undefined;

	// Cache por 5 minutos
	setHeaders({
		'Cache-Control': 'max-age=300'
	});

	const productosData = await getProductos({
		search,
		categoriaId: categoria,
		page
	});
	return {
		productos: productosData.data,
		totalPages: productosData.totalPages,
		currentPage: productosData.currentPage,
		search,
		categoriaFilter: categoria
	};
};
