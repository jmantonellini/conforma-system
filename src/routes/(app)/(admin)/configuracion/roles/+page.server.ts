import { getPermisos, getRoles } from '$lib/remote/roles.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [roles, todosPermisos] = await Promise.all([getRoles(), getPermisos()]);
	return { roles, todosPermisos };
};
