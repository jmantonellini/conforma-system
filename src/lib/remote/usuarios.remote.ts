import { getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import { roles, sesiones, usuarios } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const getCurrentUser = query(async () => {
	const event = getRequestEvent();
	
	const sessionId = event.cookies.get('session');

	if (!sessionId) return null;

	const db = getDb(event.platform?.env?.DB);

	const session = await db.select().from(sesiones).where(eq(sesiones.id, sessionId)).get();

	if (!session || session.user_id == null || new Date(session.expires_at) < new Date()) {
		return null;
	}

	const user = await db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			rol: {
				id: roles.id,
				nombre: roles.nombre,
				descripcion: roles.descripcion
			}
		})
		.from(usuarios)
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.where(eq(usuarios.id, session.user_id))
		.get();

	if (!user) return null;

	return user;
});
