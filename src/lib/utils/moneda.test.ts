import { describe, expect, it } from 'vitest';
import { aUsd, convertirEntreMonedas, desdeUsd, factorDesdeUsd, parsearTipoCambio } from './moneda';

describe('moneda', () => {
	it('usa factor 1 para dólares', () => {
		expect(factorDesdeUsd({ moneda: 'USD', tipo_cambio: null })).toBe(1);
	});

	it('exige tipo de cambio para pesos', () => {
		expect(() => factorDesdeUsd({ moneda: 'ARS', tipo_cambio: null })).toThrow();
	});

	it('convierte entre pesos y dólares con el tipo de cambio del documento', () => {
		const documento = { moneda: 'ARS' as const, tipo_cambio: 1400 };
		expect(desdeUsd(25, documento)).toBe(35000);
		expect(aUsd(35000, documento)).toBe(25);
	});

	it('convierte importes en ambos sentidos', () => {
		expect(convertirEntreMonedas(35000, 'ARS', 'USD', 1400)).toBe(25);
		expect(convertirEntreMonedas(25, 'USD', 'ARS', 1400)).toBe(35000);
		expect(convertirEntreMonedas(10, 'USD', 'USD', 1400)).toBe(10);
	});
});

describe('parsearTipoCambio', () => {
	it('lee el punto de miles como miles', () => {
		expect(parsearTipoCambio('1.570')).toBe(1570);
		expect(parsearTipoCambio('1.570,11')).toBe(1570.11);
		expect(parsearTipoCambio('1570.11')).toBe(1570.11);
		expect(parsearTipoCambio('1575')).toBe(1575);
	});

	it('rechaza valores que no son pesos por dólar', () => {
		expect(parsearTipoCambio('1,57')).toBeNull();
		expect(parsearTipoCambio('1.57')).toBeNull();
		expect(parsearTipoCambio('')).toBeNull();
	});
});
