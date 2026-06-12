import { getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import { sesiones, usuarios } from '$lib/server/db/schema';
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

	const user = await db.select().from(usuarios).where(eq(usuarios.id, session.user_id)).get();

	if (!user) return null;

	return {
		id: user.id,
		username: user.username,
		rol: String(user.rol_id ?? '')
	};
});
