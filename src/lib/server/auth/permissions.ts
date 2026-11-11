import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { permisos, roles, roles_permisos, sesiones, usuarios } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ROLES } from '$lib/utils/permissions';

export async function tienePermiso(
	user: { rol?: { id?: number | null; nombre?: string | null } | null },
	modulo: string,
	accion = 'view'
) {
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

export async function requirePermission(modulo: string, accion = 'view') {
	const event = getRequestEvent();
	const sessionId = event.cookies.get('session');
	if (!sessionId) throw new Error('No autorizado');

	const [session] = await db.select().from(sesiones).where(eq(sesiones.id, sessionId)).limit(1);
	if (!session || session.user_id == null || new Date(session.expires_at) < new Date()) {
		throw new Error('No autorizado');
	}

	const [user] = await db
		.select({
			id: usuarios.id,
			rol: {
				id: roles.id,
				nombre: roles.nombre
			}
		})
		.from(usuarios)
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.where(eq(usuarios.id, session.user_id))
		.limit(1);

	if (!user) throw new Error('No autorizado');
	if (!(await tienePermiso(user, modulo, accion))) {
		throw new Error('No tenés permiso para realizar esta acción');
	}
	return user;
}
