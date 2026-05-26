import { sesiones, usuarios } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;
		
		if (!username || !password) {
			return fail(400, { error: 'Usuario y contraseña requeridos', username });
		}

		const user = await locals.db.select().from(usuarios).where(eq(usuarios.username, username)).get();

		if (!user || !bcrypt.compareSync(password, user.password_hash)) {
			return fail(401, { error: 'Credenciales inválidas', username });
		}

		const sessionId = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30);

		await locals.db.insert(sesiones).values({
			id: sessionId,
			user_id: user.id,
			expires_at: expiresAt
		});

		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		throw redirect(303, '/dashboard');
	}
} satisfies Actions;
