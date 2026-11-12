import { describe, expect, it } from 'vitest';
import { haceCuanto } from './fechas';

describe('haceCuanto', () => {
	const ahora = new Date('2026-11-12T15:00:00');

	it('describe los tiempos recientes en minutos y horas', () => {
		expect(haceCuanto(new Date('2026-11-12T14:59:40'), ahora)).toBe('Recién');
		expect(haceCuanto(new Date('2026-11-12T14:45:00'), ahora)).toBe('Hace 15 min');
		expect(haceCuanto(new Date('2026-11-12T12:00:00'), ahora)).toBe('Hace 3 h');
	});

	it('vacío sin fecha', () => {
		expect(haceCuanto(null, ahora)).toBe('');
	});
});
