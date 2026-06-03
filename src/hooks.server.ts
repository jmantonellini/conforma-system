import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { Usuario } from '$lib/server/db/schema';

export const handle: Handle = async ({ event, resolve }) => {
	const dbBinding = event.platform?.env?.DB;

	if (dbBinding) {
		event.locals.db = getDb(dbBinding);
	} else {
		console.error('❌ Database binding "DB" not found');
	}

	return resolve(event);
};

function tienePermiso(usuario: Usuario, permisoRequerido: string) {
	// Query joins entre roles_permisos
	// Retorna boolean
}
