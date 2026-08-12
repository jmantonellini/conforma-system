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
import { getEmpleados } from '$lib/remote/empleados.remote';
import { Paths } from '$lib/types';

export const load = (async ({ cookies }) => {
	const session = cookies.get('session');

	if (!session) {
		throw redirect(303, Paths.LOGIN);
	}

	const user = await getCurrentUser();

	let permisos: { modulo: string | null; accion: string | null; id: number | null }[] = [];
	if (user?.rol?.id) {
		permisos = await getPermisosByRol(user.rol.id);
	}

	const categoriasCache = await getCategorias();

	const marcasCache = await getMarcas();

	const tiposDeUsoCache = await getTiposUso();

	const tiposVehiculoCache = await getTiposVehiculo();

	const permisosCache = await getPermisos();

	const rolesCache = await getRoles();

	const empleadosCache = await getEmpleados();

	return {
		user,
		permisos,
		session,
		empleados: empleadosCache,
		categorias: categoriasCache,
		marcas: marcasCache,
		tiposDeUso: tiposDeUsoCache,
		tiposVehiculo: tiposVehiculoCache,
		todosPermisos: permisosCache,
		todosRoles: rolesCache
	};
}) satisfies LayoutServerLoad;
