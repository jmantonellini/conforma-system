import { getPedidos, getEstadosPedido } from '$lib/remote/pedidos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const search = url.searchParams.get('search') || '';
	const estado = url.searchParams.get('estado') || '';
	const page = parseInt(url.searchParams.get('page') || '1');

	setHeaders({
		'Cache-Control': 'max-age=30'
	});

	const [pedidosData, estados] = await Promise.all([
		getPedidos({ search, estadoId: parseInt(estado) || undefined, page }),
		getEstadosPedido()
	]);

	return {
		pedidos: pedidosData.data,
		totalPages: pedidosData.totalPages,
		currentPage: pedidosData.currentPage,
		search,
		estadoFilter: estado,
		estados
	};
};
