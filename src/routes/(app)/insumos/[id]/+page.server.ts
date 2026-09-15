import { getInsumoById } from '$lib/remote/insumos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({
	insumo: await getInsumoById(Number(params.id))
});
