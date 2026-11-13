import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => ({
	filtros: {
		search: url.searchParams.get('search') || undefined,
		estadoId: Number(url.searchParams.get('estado')) || undefined,
		page: Number(url.searchParams.get('page')) || 1
	}
});
