import { redirect } from '@sveltejs/kit';

export const load = () => {
	throw redirect(308, '/contactos/crear?rol=cliente');
};
