import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import {
	empleados,
	permisos,
	roles,
	roles_permisos,
	sesiones,
	usuarios
} from '$lib/server/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { ROLES } from '$lib/utils/permissions';

type UsuarioConRol = { rol?: { id?: number | null; nombre?: string | null } | null };

export async function usuarioDeSesion() {
	const sessionId = getRequestEvent().cookies.get('session');
	if (!sessionId) return null;

	const [user] = await db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			empresa_id: usuarios.empresa_id,
			empleado_id: usuarios.empleado_id,
			empleado: { nombre: empleados.nombre, apellido: empleados.apellido },
			rol: { id: roles.id, nombre: roles.nombre, descripcion: roles.descripcion }
		})
		.from(sesiones)
		.innerJoin(usuarios, eq(usuarios.id, sesiones.user_id))
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.leftJoin(empleados, eq(empleados.id, usuarios.empleado_id))
		.where(and(eq(sesiones.id, sessionId), gt(sesiones.expires_at, new Date())))
		.limit(1);

	return user ?? null;
}

export type UsuarioSesion = NonNullable<Awaited<ReturnType<typeof usuarioDeSesion>>>;

export async function tienePermiso(user: UsuarioConRol, modulo: string, accion = 'view') {
	if (user.rol?.nombre === ROLES.ADMIN) return true;
	if (!user.rol?.id) return false;

	const [permiso] = await db
		.select({ id: permisos.id })
		.from(roles_permisos)
		.innerJoin(permisos, eq(roles_permisos.permiso_id, permisos.id))
		.where(
			and(
				eq(roles_permisos.rol_id, user.rol.id),
				eq(permisos.modulo, modulo),
				eq(permisos.accion, accion)
			)
		)
		.limit(1);

	return Boolean(permiso);
}

export const puedeVerImportes = (user: UsuarioConRol) => tienePermiso(user, 'importes', 'view');

export async function requirePermission(modulo: string, accion = 'view') {
	const user = await usuarioDeSesion();
	if (!user) error(401, 'No autorizado');
	if (!(await tienePermiso(user, modulo, accion))) {
		error(403, 'No tenés permiso para realizar esta acción');
	}
	return user;
}

export function ocultar<T extends object, K extends keyof T>(objeto: T, campos: readonly K[]) {
	const copia = { ...objeto } as Omit<T, K> & { [P in K]: T[P] | null };
	for (const campo of campos) (copia as Record<K, null>)[campo] = null;
	return copia;
}
