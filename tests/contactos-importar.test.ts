import { describe, expect, it } from 'vitest';
import {
	normalizarCabecera,
	mapearFilaContactoExcel
} from '../src/lib/server/utils/contactos-importar-excel';

describe('contactos excel import', () => {
	it('maps address and postal headers used in the contact spreadsheet', () => {
		expect(normalizarCabecera('Código Postal')).toBe('codigo_postal');
		expect(normalizarCabecera('Calle')).toBe('calle');
		expect(normalizarCabecera('Número')).toBe('numero');
		expect(normalizarCabecera('Teléfono')).toBe('telefono');

		const fila = {
			'Razón Social': 'Acme SRL',
			'Código Postal': '5000',
			Calle: 'San Martín',
			Número: '123',
			Teléfono: '3511234567'
		};

		const mapped = mapearFilaContactoExcel(fila);
		expect(mapped.codigo_postal).toBe('5000');
		expect(mapped.calle).toBe('San Martín');
		expect(mapped.numero).toBe('123');
		expect(mapped.telefono).toBe('3511234567');
	});
});
