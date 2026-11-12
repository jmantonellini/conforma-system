const URL_COTIZACION_BNA = 'https://www.bna.com.ar/Personas';
const DURACION_CACHE_MS = 5 * 60 * 1000;
const MAXIMO_DESACTUALIZADA_MS = 6 * 60 * 60 * 1000;

export class CotizacionBNAError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'CotizacionBNAError';
	}
}

export type CotizacionDolarBNA = {
	venta: number;
	fecha: string;
	hora: string;
};

let cotizacionCache: { valor: CotizacionDolarBNA; vence: number } | null = null;
let solicitudEnCurso: Promise<CotizacionDolarBNA> | null = null;

function parsearImporte(texto: string) {
	const normalizado = texto.trim().replace(/\./g, '').replace(',', '.');
	const importe = Number(normalizado);
	if (!Number.isFinite(importe) || importe <= 0) {
		throw new CotizacionBNAError('Banco Nación publicó una cotización inválida');
	}
	return importe;
}

export function parsearCotizacionDolarBNA(html: string): CotizacionDolarBNA {
	const billetes = html.match(
		/<div\b(?=[^>]*\bid=["']billetes["'])[^>]*>([\s\S]*?)(?=<div\b(?=[^>]*\bid=["']divisas["'])[^>]*>)/i
	)?.[1];
	if (!billetes)
		throw new CotizacionBNAError('No se encontró la tabla de billetes del Banco Nación');

	const fecha = billetes
		.match(/<th\b[^>]*class=["'][^"']*\bfechaCot\b[^"']*["'][^>]*>\s*([^<]+)\s*<\/th>/i)?.[1]
		?.trim();
	const dolar = billetes.match(
		/<tr\b[^>]*>\s*<td\b[^>]*class=["'][^"']*\btit\b[^"']*["'][^>]*>\s*Dolar\s+U\.S\.A\s*<\/td>\s*<td\b[^>]*>\s*([\d.,]+)\s*<\/td>\s*<td\b[^>]*>\s*([\d.,]+)\s*<\/td>\s*<\/tr>/i
	);
	const hora = billetes.match(/Hora Actualización:\s*([^<]+)/i)?.[1]?.trim();

	if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha) || !dolar || !hora) {
		throw new CotizacionBNAError('No se pudo leer la fecha, hora o cotización del Banco Nación');
	}

	return { venta: parsearImporte(dolar[2]), fecha, hora };
}

function actualizar() {
	solicitudEnCurso ??= consultarCotizacionDolarBNA()
		.then((valor) => {
			cotizacionCache = { valor, vence: Date.now() + DURACION_CACHE_MS };
			return valor;
		})
		.finally(() => {
			solicitudEnCurso = null;
		});
	return solicitudEnCurso;
}

export async function obtenerCotizacionDolarBNA(): Promise<CotizacionDolarBNA> {
	if (cotizacionCache) {
		if (cotizacionCache.vence <= Date.now()) actualizar().catch(() => {});
		if (cotizacionCache.vence + MAXIMO_DESACTUALIZADA_MS > Date.now()) return cotizacionCache.valor;
	}
	return actualizar();
}

export function precargarCotizacionDolarBNA() {
	actualizar().catch((error) => console.warn('[bna] No se pudo precargar la cotización', error));
}

async function consultarCotizacionDolarBNA(): Promise<CotizacionDolarBNA> {
	try {
		const response = await fetch(URL_COTIZACION_BNA, {
			headers: { accept: 'text/html' },
			signal: AbortSignal.timeout(8000)
		});
		if (!response.ok) {
			throw new CotizacionBNAError(`Banco Nación respondió ${response.status}`);
		}
		return parsearCotizacionDolarBNA(await response.text());
	} catch (cause) {
		if (cause instanceof CotizacionBNAError) throw cause;
		throw new CotizacionBNAError('No se pudo consultar la cotización del Banco Nación', { cause });
	}
}
