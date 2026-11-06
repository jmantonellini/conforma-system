type Permiso = { modulo: string | null; accion: string | null };

export const ROLES = {
	ADMIN: 'admin',
	OFICINA_TECNICA: 'oficina_tecnica'
} as const;

export function puedeVerImportes(user: { rol?: { nombre?: string } | null } | null) {
	return user?.rol?.nombre !== ROLES.OFICINA_TECNICA;
}

export function esRol(user: { rol?: { nombre?: string } | null } | null, rol: string) {
	return user?.rol?.nombre === rol;
}

export function can(
	user: { rol?: { nombre?: string } | null } | null,
	permisos: Permiso[],
	modulo: string,
	accion: string = 'view'
): boolean {
	if (!user) return false;
	if (esRol(user, ROLES.ADMIN)) return true;
	return permisos.some((p) => p.modulo === modulo && p.accion === accion);
}
