import { describe, expect, it } from 'vitest';
import { fechaDesdeInput, fechaInput, haceCuanto } from './fechas';

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

describe('fechaInput', () => {
	it('usa el día de Argentina aunque en UTC ya sea el siguiente', () => {
		expect(fechaInput(new Date('2026-11-18T01:30:00Z'))).toBe('2026-11-17');
		expect(fechaInput(new Date('2026-11-18T15:00:00Z'))).toBe('2026-11-18');
	});

	it('ida y vuelta con fechaDesdeInput', () => {
		expect(fechaInput(fechaDesdeInput('2026-10-29'))).toBe('2026-10-29');
	});
});
