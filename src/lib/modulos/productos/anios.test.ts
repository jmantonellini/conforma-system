import { describe, expect, it } from 'vitest';
import { anioDeBusqueda, formatearAnios } from './anios';

describe('formatearAnios', () => {
	it('arma el rango según los años cargados', () => {
		expect(formatearAnios(null, null)).toBe('');
		expect(formatearAnios(2010, 2016)).toBe('2010–2016');
		expect(formatearAnios(2017, null)).toBe('2017 en adelante');
		expect(formatearAnios(null, 2009)).toBe('hasta 2009');
		expect(formatearAnios(2015, 2015)).toBe('2015');
	});
});

describe('anioDeBusqueda', () => {
	it('reconoce solo años de cuatro cifras', () => {
		expect(anioDeBusqueda(' 2014 ')).toBe(2014);
		expect(anioDeBusqueda('amarok')).toBeNull();
		expect(anioDeBusqueda('157')).toBeNull();
		expect(anioDeBusqueda(undefined)).toBeNull();
	});
});
