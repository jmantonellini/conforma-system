import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	getCategorias,
	getMarcas,
	getTiposUso,
	getTiposVehiculo
} from '$lib/remote/productos.remote';
import { getCurrentUser } from '$lib/remote/usuarios.remote';
import { getPermisos, getPermisosByRol, getRoles } from '$lib/remote/roles.remote';

let categoriasCache: unknown = null;
let marcasCache: unknown = null;
let tiposDeUsoCache: unknown = null;
let tiposVehiculoCache: unknown = null;
let rolesCache: unknown = null;
let permisosCache: unknown = null;

export const load = (async ({ cookies }) => {
	const session = cookies.get('session');
	const user = await getCurrentUser();
	let permisos: { modulo: string | null; accion: string | null; id: number | null }[] = [];
	if (user?.rol?.id) {
		permisos = await getPermisosByRol(user.rol.id);
	}

	if (!session) {
		throw redirect(303, '/login');
	}

	if (!categoriasCache) {
		categoriasCache = await getCategorias();
	}

	if (!marcasCache) {
		marcasCache = await getMarcas();
	}

	if (!tiposDeUsoCache) {
		tiposDeUsoCache = await getTiposUso();
	}

	if (!tiposVehiculoCache) {
		tiposVehiculoCache = await getTiposVehiculo();
	}

	if (!permisosCache) {
		permisosCache = await getPermisos();
	}

	if (!rolesCache) {
		rolesCache = await getRoles();
	}

	return {
		user,
		permisos,
		session,
		categorias: categoriasCache,
		marcas: marcasCache,
		tiposDeUso: tiposDeUsoCache,
		tiposVehiculo: tiposVehiculoCache,
		todosPermisos: permisosCache,
		todosRoles: rolesCache
	};
}) satisfies LayoutServerLoad;
