import { error } from '@sveltejs/kit';
import {
	getCotizacionById,
	getEstadosCotizacion,
	getHistorialCotizacion,
	getNotasCotizacion
} from '$lib/remote/cotizaciones-consultas.remote';
import { getProductos } from '$lib/remote/productos.remote';
import {
	getCategoriasInsumo,
	getInsumos,
	getTiposInsumo,
	getUnidadesInsumo
} from '$lib/remote/insumos.remote';
import { getEmpleados } from '$lib/remote/empleados.remote';
import { can } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user, permisos } = await parent();
	const puedeEditarCotizacion =
		can(user, permisos, 'cotizaciones', 'cotizar') && can(user, permisos, 'importes', 'view');
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Cotización no encontrada');
	const { cotizacion, lineas, adjuntos } = await getCotizacionById(id);
	const [historial, notas, empleados, estados] = await Promise.all([
		getHistorialCotizacion(id),
		getNotasCotizacion(id),
		getEmpleados(),
		getEstadosCotizacion()
	]);
	const catalogos = puedeEditarCotizacion
		? await Promise.all([
				getProductos({ limit: 100 }),
				getInsumos({ limit: 100 }),
				getTiposInsumo(),
				getCategoriasInsumo(),
				getUnidadesInsumo()
			])
		: null;
	return {
		estados,
		cotizacion,
		lineas,
		adjuntos,
		historial,
		notas,
		empleados,
		productos: catalogos?.[0].data ?? [],
		insumos: catalogos?.[1].data ?? [],
		tiposInsumo: catalogos?.[2] ?? [],
		categoriasInsumo: catalogos?.[3] ?? [],
		unidadesInsumo: catalogos?.[4] ?? []
	};
};
