import type { PageLoad } from './$types';

const ROLES = ['cliente', 'distribuidor', 'proveedor'] as const;
const ORDENES = ['razon_social', 'cuit', 'email', 'created_at'] as const;

export const load: PageLoad = ({ url }) => {
	const rol = ROLES.find((valor) => valor === url.searchParams.get('rol')) ?? 'todos';
	const sort = ORDENES.find((orden) => orden === url.searchParams.get('sort')) ?? 'razon_social';
	return {
		filtros: {
			search: url.searchParams.get('search') || undefined,
			rol,
			sort,
			direction: url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc',
			page: Number(url.searchParams.get('page')) || 1
		} as const
	};
};
