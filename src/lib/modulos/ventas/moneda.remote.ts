import { query } from '$app/server';
import { usuarioDeSesion, tienePermiso } from '$lib/server/auth/permissions';
import { dolarBNA } from './moneda.server';

export const getDolarBNA = query(async () => {
	const usuario = await usuarioDeSesion();
	if (!usuario || !(await tienePermiso(usuario, 'importes', 'view'))) return null;
	return dolarBNA();
});
