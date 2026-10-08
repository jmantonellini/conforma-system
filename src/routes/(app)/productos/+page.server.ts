import { getCategorias, getProductos } from '$lib/remote/productos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const search = url.searchParams.get('search') || undefined;
	const categoria = Number(url.searchParams.get('categoria')) || undefined;
	const page = Number(url.searchParams.get('page')) || undefined;
	const sortParametro = url.searchParams.get('sort');
	const sort = ['nombre', 'codigo'].includes(sortParametro ?? '')
		? (sortParametro as 'nombre' | 'codigo')
		: 'nombre';
	const direction = url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc';

	setHeaders({
		'Cache-Control': 'private, no-store'
	});

	const [productosData, categorias] = await Promise.all([
		getProductos({
			search,
			categoriaId: categoria,
			sort,
			direction,
			page
		}),
		getCategorias()
	]);
	return {
		productos: productosData.data,
		categorias,
		totalPages: productosData.totalPages,
		currentPage: productosData.currentPage,
		search,
		categoriaFilter: categoria,
		sort,
		direction
	};
};
