import { obtenerContactoPorId, obtenerPedidosContacto } from '$lib/remote/contactos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const contactoId = Number(params.id);
	const [contacto, pedidos] = await Promise.all([
		obtenerContactoPorId(contactoId),
		obtenerPedidosContacto(contactoId)
	]);
	return { contacto, pedidos };
};
