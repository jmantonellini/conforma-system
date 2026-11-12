import { command, form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { usuarios, sesiones, feedback } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { error } from '@sveltejs/kit';
import { LoginSchema } from './auth.schema';
import * as v from 'valibot';

export const login = form(LoginSchema, async (data) => {
	const event = getRequestEvent();

	const [user] = await db
		.select()
		.from(usuarios)
		.where(eq(usuarios.username, data.username))
		.limit(1);

	if (!user || !user.activo || !(await bcrypt.compare(data.password, user.password_hash))) {
		error(400, 'Credenciales inválidas');
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

	return { success: true, message: 'Inicio de sesión exitoso' };
});

export const logout = command(async () => {
	const event = getRequestEvent();
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		await db.delete(sesiones).where(eq(sesiones.id, sessionId));
	}

	event.cookies.delete('session', { path: '/' });

	return { success: true };
});

export const enviarFeedback = form(
	v.object({
		mensaje: v.pipe(v.string(), v.nonEmpty('El mensaje es requerido'))
	}),
	async (data) => {
		await db.insert(feedback).values({
			mensaje: data.mensaje
		});

		return { success: true };
	}
);
