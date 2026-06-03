import { sesiones } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, type Actions } from '@sveltejs/kit';

export const actions = {
	default: async ({ cookies, locals }) => {
		// Obtener el ID de sesión de la cookie
		const sessionId = cookies.get('session');

		// Si existe una sesión, eliminarla de la base de datos
		if (sessionId) {
			await locals.db.delete(sesiones).where(eq(sesiones.id, sessionId));
		}

		// Eliminar la cookie
		cookies.delete('session', { path: '/' });

		// Redirigir al login
		throw redirect(303, '/login');
	}
} satisfies Actions;
