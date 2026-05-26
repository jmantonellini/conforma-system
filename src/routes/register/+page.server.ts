import { usuarios } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { fail, type Actions } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		if (!username || !password) {
			return fail(400, { error: 'Todos los campos son requeridos' });
		}

		if (password.length < 4) {
			return fail(400, { error: 'La contraseña debe tener al menos 4 caracteres' });
		}

		// Verificar si el usuario ya existe
		const existingUser = await locals.db
			.select()
			.from(usuarios)
			.where(eq(usuarios.username, username))
			.get();

		if (existingUser) {
			return fail(400, { error: 'El usuario ya existe' });
		}

		// Generar hash de la contraseña
		const hash = bcrypt.hashSync(password, 10);

		try {
			await locals.db.insert(usuarios).values({
				username,
				password_hash: hash,
			});

			return { success: true, message: 'Usuario creado exitosamente. Ahora podés iniciar sesión.' };
		} catch (error) {
			console.error('Error al crear usuario:', error);
			return fail(500, { error: 'Error interno al crear usuario' });
		}
	}
} satisfies Actions;
