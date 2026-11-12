import {
	getCotizaciones,
	getEstadosCotizacion
} from '$lib/modulos/cotizaciones/cotizaciones-consultas.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const estado = url.searchParams.get('estado') || '';
	const page = parseInt(url.searchParams.get('page') || '1');

	const [cotizacionesData, estados] = await Promise.all([
		getCotizaciones({ search, estadoId: parseInt(estado) || undefined, page }),
		getEstadosCotizacion()
	]);

	return {
		cotizaciones: cotizacionesData.data,
		total: cotizacionesData.total,
		totalPages: cotizacionesData.totalPages,
		currentPage: cotizacionesData.currentPage,
		estados
	};
};
