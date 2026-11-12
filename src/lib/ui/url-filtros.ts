import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import type { Pathname } from '$app/types';

export const parametro = (clave: string, porDefecto = '') =>
	page.url.searchParams.get(clave) ?? porDefecto;

export function filtrar(
	cambios: Record<string, string | number | null | undefined>,
	{ reemplazar = false } = {}
) {
	const params = new URLSearchParams(page.url.searchParams);
	for (const [clave, valor] of Object.entries(cambios)) {
		if (valor === '' || valor === null || valor === undefined) params.delete(clave);
		else params.set(clave, String(valor));
	}
	if (!('page' in cambios)) params.delete('page');
	const destino = `${page.url.pathname}${params.size ? `?${params}` : ''}`;
	return goto(resolve(destino as Pathname as '/'), {
		keepFocus: true,
		noScroll: !('page' in cambios),
		replaceState: reemplazar
	});
}

export function ordenar(clave: string, porDefecto: string) {
	const actual = parametro('sort', porDefecto);
	const direccion = parametro('direction', 'asc');
	return filtrar({
		sort: clave,
		direction: actual === clave && direccion === 'asc' ? 'desc' : 'asc'
	});
}
