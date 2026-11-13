import { redondearPrecio } from './precios';

export const MONEDAS = ['USD', 'ARS'] as const;
export type Moneda = (typeof MONEDAS)[number];

export const SIMBOLO_MONEDA: Record<Moneda, string> = { USD: 'US$', ARS: '$' };
export const NOMBRE_MONEDA: Record<Moneda, string> = { USD: 'Dólares', ARS: 'Pesos' };

export type MonedaDocumento = { moneda: Moneda; tipo_cambio: number | null };

export function factorDesdeUsd({ moneda, tipo_cambio }: MonedaDocumento) {
	if (moneda === 'USD') return 1;
	if (!tipo_cambio || tipo_cambio <= 0) throw new Error('Falta el tipo de cambio del documento');
	return tipo_cambio;
}

export const aUsd = (valor: number, documento: MonedaDocumento) =>
	redondearPrecio(valor / factorDesdeUsd(documento));

export const desdeUsd = (valor: number, documento: MonedaDocumento) =>
	redondearPrecio(valor * factorDesdeUsd(documento));

export function convertirEntreMonedas(
	valor: number,
	desde: Moneda,
	hacia: Moneda,
	tipoCambio: number
) {
	if (desde === hacia) return redondearPrecio(valor);
	return redondearPrecio(desde === 'USD' ? valor * tipoCambio : valor / tipoCambio);
}
