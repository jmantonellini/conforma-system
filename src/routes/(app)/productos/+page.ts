import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const sort = url.searchParams.get('sort') === 'codigo' ? 'codigo' : 'nombre';
	return {
		filtros: {
			search: url.searchParams.get('search') || undefined,
			categoriaId: Number(url.searchParams.get('categoria')) || undefined,
			sort,
			direction: url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc',
			page: Number(url.searchParams.get('page')) || 1
		} as const
	};
};
