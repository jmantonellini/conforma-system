import { getCotizacionById, getHistorialCotizacion } from '$lib/remote/cotizaciones.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const { cotizacion, lineas, adjuntos } = await getCotizacionById(id);
	const historial = await getHistorialCotizacion(id);
	return { cotizacion, lineas, adjuntos, historial };
};
