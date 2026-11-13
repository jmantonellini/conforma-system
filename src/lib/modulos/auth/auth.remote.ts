import { command, form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { usuarios, sesiones, feedback } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { error } from '@sveltejs/kit';
import { LoginSchema } from './auth.schema';
import * as v from 'valibot';

export const login = form(LoginSchema, async (data) => {
	const event = getRequestEvent();

	const [user] = await db
		.select()
		.from(usuarios)
		.where(sql`lower(${usuarios.username}) = ${data.username}`)
		.limit(1);

	const motivo = !user
		? 'usuario inexistente'
		: !user.activo
			? 'usuario inactivo'
			: !(await bcrypt.compare(data.password, user.password_hash))
				? 'contraseña incorrecta'
				: null;
	if (motivo) {
		console.warn(
			`[login] Rechazado "${data.username}": ${motivo} (ip ${event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress()})`
		);
		error(400, 'Credenciales inválidas');
	}

	const sessionId = crypto.randomUUID();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30);

	await Promise.all([
		db.insert(sesiones).values({ id: sessionId, user_id: user.id, expires_at: expiresAt }),
		db.update(usuarios).set({ ultimo_acceso: new Date() }).where(eq(usuarios.id, user.id))
	]);

	event.cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	});

	console.info(`[login] Ingresó "${user.username}"`);
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
