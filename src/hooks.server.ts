import { getDb } from '$lib/server/db';

export const handle = async ({ event, resolve }) => {
	// Inyectar DB en locals para otros usos
	if (event.platform?.env?.DB) {
		event.locals.db = getDb(event.platform.env.DB);
	}

	return resolve(event);
};
function tienePermiso(usuario: Usuario, permisoRequerido: string) {
	// Query joins entre roles_permisos
	// Retorna boolean
}
