import { describe, expect, it } from 'vitest';
import { calcularPrecioConDescuento, calcularPrecioVenta } from './precios';

describe('quotation pricing', () => {
	it('calculates the sale price from cost and margin', () => {
		expect(calcularPrecioVenta(100, 25)).toBe(133.33);
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
