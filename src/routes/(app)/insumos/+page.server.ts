import { getInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || undefined;
	const tipo = url.searchParams.get('tipo') || undefined;
	return {
		insumos: await getInsumos({ search, tipo, limit: 100 }),
		search: search ?? '',
		tipo: tipo ?? ''
	};
};
