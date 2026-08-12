type Permiso = { modulo: string | null; accion: string | null };

export function can(
	user: { rol?: { nombre?: string } | null } | null,
	permisos: Permiso[],
	modulo: string,
	accion: string = 'view'
): boolean {
	if (!user) return false;
	if (user.rol?.nombre === 'admin') return true;
	return permisos.some((p) => p.modulo === modulo && p.accion === accion);
}
