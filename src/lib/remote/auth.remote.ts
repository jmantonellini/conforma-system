import { command, form, getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { usuarios, sesiones, feedback } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { redirect } from '@sveltejs/kit';
import { LoginSchema } from './auth.schema';
import * as v from 'valibot';

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

export const register = form(LoginSchema, async (data) => {
	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);

	// Verificar si el usuario ya existe
	const existingUser = await db
		.select()
		.from(usuarios)
		.where(eq(usuarios.username, data.username))
		.get();

	if (existingUser) {
		throw new Error('El usuario ya existe');
	}

	// Generar hash de la contraseña
	const hash = bcrypt.hashSync(data.password, 10);

	try {
		await db.insert(usuarios).values({
			username: data.username,
			password_hash: hash
		});

		redirect(303, '/login');
	} catch (error) {
		console.error('Error al crear usuario:', error);
		return { success: false, message: 'Error al crear usuario' };
	}
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

export const enviarFeedback = form(
	v.object({
		mensaje: v.pipe(v.string(), v.nonEmpty('El mensaje es requerido'))
	}),
	async (data) => {
		const event = getRequestEvent();
		const db = getDb(event.platform?.env?.DB);
		console.log('MENSAJE', data.mensaje);

		await db.insert(feedback).values({
			mensaje: data.mensaje
		});

		return { success: true };
	}
);
