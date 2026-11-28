import type { AfterNavigate } from '@sveltejs/kit';

const CLAVE = 'conforma:listados';
let ultimas: Record<string, string> | null = null;
let anterior: string | null = null;

const direccion = (url: URL) => `${url.pathname}${url.search}`;

function leer() {
	if (ultimas) return ultimas;
	try {
		ultimas = JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}');
	} catch {
		ultimas = {};
	}
	return (ultimas ??= {});
}

export function recordarListado(url: URL) {
	const guardadas = leer();
	if (guardadas[url.pathname] === direccion(url)) return;
	guardadas[url.pathname] = direccion(url);
	try {
		sessionStorage.setItem(CLAVE, JSON.stringify(guardadas));
	} catch {
		return;
	}
}

export function registrarNavegacion({ from, to }: AfterNavigate) {
	anterior = from ? direccion(from.url) : null;
	if (to?.url) recordarListado(to.url);
}

export function destinoVolver(listado: string) {
	if (typeof sessionStorage === 'undefined') return listado;
	return leer()[listado] ?? listado;
}

export const esPaginaAnterior = (destino: string) => anterior === destino;
