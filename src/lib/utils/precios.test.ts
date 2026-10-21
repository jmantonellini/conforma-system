import { describe, expect, it } from 'vitest';
import {
	ajustarPrecioPorCambioDeCosto,
	calcularIva21,
	calcularCostoComposicion,
	calcularPrecioConDescuento,
	calcularPrecioVenta,
	formatearDosDecimales,
	parsearNumeroDecimal,
	precioNetoCubreCosto
} from './precios';

describe('quotation pricing', () => {
	it('calculates 21% VAT to two decimal places', () => {
		expect(calcularIva21(100)).toBe(21);
		expect(calcularIva21(12.34)).toBe(2.59);
	});

	it('calculates the sale price from cost and margin', () => {
		expect(calcularPrecioVenta(100, 25)).toBe(133.33);
	});

	it('formats values with exactly two locale decimals', () => {
		expect(formatearDosDecimales(1234.5)).toBe('1.234,50');
		expect(formatearDosDecimales(12.345)).toBe('12,35');
		expect(formatearDosDecimales(12)).toBe('12,00');
	});

	it('parses decimal prices entered with comma or dot', () => {
		expect(parsearNumeroDecimal('0,5')).toBe(0.5);
		expect(parsearNumeroDecimal('1.234,56')).toBe(1234.56);
		expect(parsearNumeroDecimal('0.5')).toBe(0.5);
		expect(parsearNumeroDecimal('')).toBeNull();
	});

	it('calculates the per-unit cost of associated materials', () => {
		expect(
			calcularCostoComposicion([
				{ cantidad: 2, costo_unitario: 12.5 },
				{ cantidad: 0.5, costo_unitario: 8 }
			])
		).toBe(29);
	});

	it('adds and removes only the material cost difference from a concept price', () => {
		expect(ajustarPrecioPorCambioDeCosto(120, 0, 25.6)).toBe(145.6);
		expect(ajustarPrecioPorCambioDeCosto(145.6, 25.6, 0)).toBe(120);
	});

	it('checks whether the quote net covers all material costs', () => {
		expect(precioNetoCubreCosto(30, 30)).toBe(true);
		expect(precioNetoCubreCosto(29.99, 30)).toBe(false);
	});

	it('applies a justified discount to the list price', () => {
		expect(calcularPrecioConDescuento(100, 10, 'Promotional price')).toBe(90);
	});

	it('requires a justification for a non-zero discount', () => {
		expect(() => calcularPrecioConDescuento(100, 10)).toThrow('Indicá el motivo del descuento');
	});

	it('rejects a discount of 100 percent or more', () => {
		expect(() => calcularPrecioConDescuento(100, 100, 'Invalid')).toThrow(
			'El descuento debe estar entre 0 y 99.99%'
		);
	});
});
