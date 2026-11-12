import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getCurrentUser } from '$lib/modulos/configuracion/usuarios.remote';
import { getPermisosByRol } from '$lib/modulos/configuracion/roles.remote';
import { Paths } from '$lib/tipos';
import { obtenerEmpresa } from '$lib/server/empresa';

export const load = (async ({ cookies }) => {
	const session = cookies.get('session');

	if (!session) {
		throw redirect(303, Paths.LOGIN);
	}

	const user = await getCurrentUser();
	if (!user) throw redirect(303, Paths.LOGIN);

	const [permisos, empresa] = await Promise.all([
		user.rol?.id ? getPermisosByRol(user.rol.id) : [],
		obtenerEmpresa()
	]);

	return {
		user,
		permisos,
		empresa: empresa ? { razon_social: empresa.razon_social } : null,
		session
	};
}) satisfies LayoutServerLoad;
