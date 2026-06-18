import * as v from 'valibot';
import { command, form, getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { usuarios, sesiones } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { redirect } from '@sveltejs/kit';
import { LoginSchema } from './auth.schema';


export const login = form(LoginSchema, async (data) => {
	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);

	const user = await db.select().from(usuarios).where(eq(usuarios.username, data.username)).get();

	if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
		throw new Error('Credenciales inválidas');
	}

	const sessionId = crypto.randomUUID();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30);

	await db.insert(sesiones).values({
		id: sessionId,
		user_id: user.id,
		expires_at: expiresAt
	});

	event.cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	});

	redirect(303, '/');
});

export const logout = command(async () => {
	const event = getRequestEvent();
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const db = getDb(event.platform?.env?.DB);
		await db.delete(sesiones).where(eq(sesiones.id, sessionId));
	}

	event.cookies.delete('session', { path: '/' });

	return { success: true };
});
