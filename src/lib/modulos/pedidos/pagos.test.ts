import { describe, expect, it } from 'vitest';
import { ajustarAlSaldo, montoAplicado, saldoEnMoneda } from './pagos';

describe('montoAplicado', () => {
	it('usa el monto tal cual si la moneda coincide con la del pedido', () => {
		expect(montoAplicado({ monto: 150000, moneda: 'ARS' }, 'ARS')).toBe(150000);
	});

	it('convierte pesos a dólares con el tipo de cambio del pago', () => {
		expect(montoAplicado({ monto: 1415000, moneda: 'ARS', tipo_cambio: 1415 }, 'USD')).toBe(1000);
	});

	it('convierte dólares a pesos', () => {
		expect(montoAplicado({ monto: 100, moneda: 'USD', tipo_cambio: 1400 }, 'ARS')).toBe(140000);
	});

	it('exige tipo de cambio cuando las monedas difieren', () => {
		expect(() => montoAplicado({ monto: 1000, moneda: 'ARS' }, 'USD')).toThrow();
	});
});

describe('ajustarAlSaldo', () => {
	it('absorbe la diferencia de redondeo contra el saldo', () => {
		expect(ajustarAlSaldo(1000.38, 1000.37)).toBe(1000.37);
		expect(ajustarAlSaldo(1000.36, 1000.37)).toBe(1000.37);
	});

	it('no toca pagos que no saldan el pedido', () => {
		expect(ajustarAlSaldo(500, 1000.37)).toBe(500);
	});
});

describe('saldoEnMoneda', () => {
	it('expresa el saldo en la moneda del pago', () => {
		expect(saldoEnMoneda(1000, 'USD', 'ARS', 1415)).toBe(1415000);
		expect(saldoEnMoneda(1000, 'USD', 'USD', null)).toBe(1000);
	});

	it('devuelve null si falta el tipo de cambio', () => {
		expect(saldoEnMoneda(1000, 'USD', 'ARS', null)).toBeNull();
	});
});
