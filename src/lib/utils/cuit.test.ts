import { describe, expect, it } from 'vitest';
import { esCuitValido, formatearCuit } from './cuit';

describe('CUIT', () => {
	it('formats values as the user types or pastes them', () => {
		expect(formatearCuit('20')).toBe('20');
		expect(formatearCuit('201')).toBe('20-1');
		expect(formatearCuit('2012345678')).toBe('20-12345678');
		expect(formatearCuit('20123456786')).toBe('20-12345678-6');
		expect(formatearCuit('20-12345678-6')).toBe('20-12345678-6');
	});

	it('requires 11 digits and a valid check digit', () => {
		expect(esCuitValido('20123456786')).toBe(true);
		expect(esCuitValido('20123456787')).toBe(false);
		expect(esCuitValido('20-12345678-6')).toBe(false);
		expect(esCuitValido('2012345678')).toBe(false);
	});
});
