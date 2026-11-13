import type { PageLoad } from './$types';

const ORDENES = ['nombre', 'codigo', 'costo_unitario'] as const;

export const load: PageLoad = ({ url }) => {
	const sort = ORDENES.find((orden) => orden === url.searchParams.get('sort')) ?? 'nombre';
	return {
		filtros: {
			search: url.searchParams.get('search') || undefined,
			tipo: url.searchParams.get('tipo') || undefined,
			categoriaId: Number(url.searchParams.get('categoria')) || undefined,
			sort,
			direction: url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc',
			page: Number(url.searchParams.get('page')) || 1
		} as const
	};
};
