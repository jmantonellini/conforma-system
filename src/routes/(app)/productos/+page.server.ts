import { getProductos } from '$lib/remote/productos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const search = url.searchParams.get('search') || undefined;
	const categoria = Number(url.searchParams.get('categoria')) || undefined;
	const page = Number(url.searchParams.get('page')) || undefined;
	const sortParametro = url.searchParams.get('sort');
	const sort = ['nombre', 'codigo', 'precio_base'].includes(sortParametro ?? '')
		? (sortParametro as 'nombre' | 'codigo' | 'precio_base')
		: 'nombre';
	const direction = url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc';

	// Cache por 5 minutos
	setHeaders({
		'Cache-Control': 'max-age=300'
	});

	const productosData = await getProductos({
		search,
		categoriaId: categoria,
		sort,
		direction,
		page
	});
	return {
		productos: productosData.data,
		totalPages: productosData.totalPages,
		currentPage: productosData.currentPage,
		search,
		categoriaFilter: categoria,
		sort,
		direction
	};
};
