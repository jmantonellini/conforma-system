import { getClientes } from '$lib/remote/clientes.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1');

	// Cache por 5 minutos
	setHeaders({
		'Cache-Control': 'max-age=300'
	});

	const clientesData = await getClientes({ search, page });

	return {
		clientes: clientesData.data,
		totalPages: clientesData.totalPages,
		currentPage: clientesData.currentPage,
		search
	};
};
