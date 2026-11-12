import type { Formato, Valor } from './tipos';

const moneda = new Intl.NumberFormat('es-AR', {
	style: 'currency',
	currency: 'ARS',
	maximumFractionDigits: 0
});
const entero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
const porcentaje = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 });

export function formatear(valor: Valor | undefined, formato: Formato = 'texto') {
	if (valor === null || valor === undefined || valor === '') return '-';
	if (typeof valor === 'string') return valor;
	switch (formato) {
		case 'moneda':
			return moneda.format(valor);
		case 'porcentaje':
			return porcentaje.format(valor);
		case 'dias':
			return `${entero.format(Math.round(valor * 10) / 10)} días`;
		default:
			return entero.format(valor);
	}
}

export function formatearEje(valor: number, formato: Formato) {
	if (formato === 'porcentaje') return porcentaje.format(valor);
	const texto = Math.abs(valor) >= 10_000 ? compacto.format(valor) : entero.format(valor);
	return formato === 'moneda' ? `$ ${texto}` : texto;
}

export function variacion(valor: number | null, previo: number | null) {
	if (valor === null || previo === null || previo === 0) return null;
	return (valor - previo) / Math.abs(previo);
}
