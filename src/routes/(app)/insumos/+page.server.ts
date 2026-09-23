import { getCategoriasInsumo, getInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const tipo = url.searchParams.get('tipo') || '';
	const categoriaId = Number(url.searchParams.get('categoria')) || undefined;
	const page = Number(url.searchParams.get('page')) || 1;
	const sortParametro = url.searchParams.get('sort');
	const sort = ['nombre', 'codigo', 'costo_unitario'].includes(sortParametro ?? '')
		? (sortParametro as 'nombre' | 'codigo' | 'costo_unitario')
		: 'nombre';
	const direction = url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc';
	const [insumos, categorias] = await Promise.all([
		getInsumos({
			search: search || undefined,
			tipo: tipo || undefined,
			categoriaId,
			sort,
			direction,
			page
		}),
		getCategoriasInsumo()
	]);
	return {
		insumos,
		categorias,
		search,
		tipo,
		categoriaId: categoriaId ? String(categoriaId) : '',
		currentPage: page,
		sort,
		direction
	};
};
