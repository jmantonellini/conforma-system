import { getInsumoById, getMovimientosInsumos } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [insumo, movimientos] = await Promise.all([
		getInsumoById(id),
		getMovimientosInsumos({ insumo_id: id, limit: 8 })
	]);
	return { insumo, movimientos };
};
