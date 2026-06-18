import { getCurrentUser } from '$lib/remote/usuarios.remote';

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export const authState = $state<{
	user: CurrentUser;
	permisos: {
		modulo: string | null;
		accion: string | null;
		id: number | null;
	}[];
	isLoading: boolean;
	loaded: boolean;
}>({
	user: null,
	permisos: [],
	isLoading: true,
	loaded: false
});

// Verificar permiso (sincrónico, desde memoria)
export function can(modulo: string, accion: string = 'view'): boolean {
	if (!authState.user) return false;
	if (authState.user.rol?.nombre === 'admin') return true;
	return authState.permisos.some((p) => p.modulo === modulo && p.accion === accion);
}

export function logout() {
	authState.user = null;
	authState.permisos = [];
	authState.loaded = false;
}
