import { obtenerContactos } from '$lib/remote/contactos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const rolParametro = url.searchParams.get('rol');
	const rol = ['cliente', 'proveedor', 'ambos'].includes(rolParametro ?? '')
		? (rolParametro as 'cliente' | 'proveedor' | 'ambos')
		: 'todos';
	const page = Number(url.searchParams.get('page')) || 1;
	const sortParametro = url.searchParams.get('sort');
	const sort = ['razon_social', 'cuit', 'email', 'created_at'].includes(sortParametro ?? '')
		? (sortParametro as 'razon_social' | 'cuit' | 'email' | 'created_at')
		: 'razon_social';
	const direction = url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc';
	const contactos = await obtenerContactos({ search, rol, page, sort, direction });

	return {
		contactos: contactos.data,
		totalPages: contactos.totalPages,
		currentPage: contactos.currentPage,
		search,
		rolFilter: rol,
		sort,
		direction
	};
};
