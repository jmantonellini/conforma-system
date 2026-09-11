import { getCotizaciones, getEstadosCotizacion } from '$lib/remote/cotizaciones.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const search = url.searchParams.get('search') || '';
	const estado = url.searchParams.get('estado') || '';
	const page = parseInt(url.searchParams.get('page') || '1');

	setHeaders({
		'Cache-Control': 'max-age=30'
	});

	const [cotizacionesData, estados] = await Promise.all([
		getCotizaciones({ search, estadoId: parseInt(estado) || undefined, page }),
		getEstadosCotizacion()
	]);

	return {
		cotizaciones: cotizacionesData.data,
		totalPages: cotizacionesData.totalPages,
		currentPage: cotizacionesData.currentPage,
		search,
		estadoFilter: estado,
		estados
	};
};
