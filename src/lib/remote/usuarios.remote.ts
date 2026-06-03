import { getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import { usuarios, sesiones } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const getCurrentUser = query(async () => {
	const event = getRequestEvent();
	const sessionId = event.cookies.get('session');

	if (!sessionId) return null;

	const db = getDb(event.platform?.env?.DB);

	const session = await db.select().from(sesiones).where(eq(sesiones.id, sessionId)).get();

	if (!session?.user_id) return null;

	return await db.select().from(usuarios).where(eq(usuarios.id, session.user_id)).get();
});
