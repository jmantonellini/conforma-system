import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getCurrentUser } from '$lib/remote/usuarios.remote';
import { getPermisosByRol } from '$lib/remote/roles.remote';
import { Paths } from '$lib/types';

export const load = (async ({ cookies }) => {
	const session = cookies.get('session');

	if (!session) {
		throw redirect(303, Paths.LOGIN);
	}

	const user = await getCurrentUser();
	if (!user) throw redirect(303, Paths.LOGIN);

	const permisos = user.rol?.id ? await getPermisosByRol(user.rol.id) : [];

	return {
		user,
		permisos,
		session
	};
}) satisfies LayoutServerLoad;
