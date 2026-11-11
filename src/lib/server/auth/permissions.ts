import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { permisos, roles, roles_permisos, sesiones, usuarios } from '$lib/server/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { ROLES } from '$lib/utils/permissions';

type UsuarioConRol = { rol?: { id?: number | null; nombre?: string | null } | null };

/** Usuario de la sesión actual (cookie `session`), o `null` si no hay sesión válida. */
export async function usuarioDeSesion() {
	const sessionId = getRequestEvent().cookies.get('session');
	if (!sessionId) return null;

	const [user] = await db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			rol: { id: roles.id, nombre: roles.nombre, descripcion: roles.descripcion }
		})
		.from(sesiones)
		.innerJoin(usuarios, eq(usuarios.id, sesiones.user_id))
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
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

/** Exige sesión y permiso; devuelve el usuario para no repetir la consulta en cada acción. */
export async function requirePermission(modulo: string, accion = 'view') {
	const user = await usuarioDeSesion();
	if (!user) error(401, 'No autorizado');
	if (!(await tienePermiso(user, modulo, accion))) {
		error(403, 'No tenés permiso para realizar esta acción');
	}
	return user;
}

/** Devuelve una copia del objeto con los campos indicados en `null` (para ocultar importes). */
export function ocultar<T extends object, K extends keyof T>(objeto: T, campos: readonly K[]) {
	const copia = { ...objeto } as Omit<T, K> & { [P in K]: T[P] | null };
	for (const campo of campos) (copia as Record<K, null>)[campo] = null;
	return copia;
}
