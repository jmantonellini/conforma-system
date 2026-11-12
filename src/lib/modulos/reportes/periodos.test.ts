import { describe, expect, it } from 'vitest';
import { agrupacionPara, grupos, hoyLocal, rangoDe, rangoPrevio } from './periodos';

const HOY = '2026-11-12';

describe('periodos de reportes', () => {
	it('calcula semanas desde el lunes', () => {
		expect(rangoDe('semana', HOY)).toEqual({ desde: '2026-11-09', hasta: HOY });
		expect(rangoDe('semana_pasada', HOY)).toEqual({ desde: '2026-11-02', hasta: '2026-11-08' });
	});

	it('calcula meses, trimestre y año', () => {
		expect(rangoDe('mes', HOY)).toEqual({ desde: '2026-11-01', hasta: HOY });
		expect(rangoDe('mes_pasado', HOY)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
		expect(rangoDe('mes_pasado', '2026-01-15')).toEqual({
			desde: '2025-12-01',
			hasta: '2025-12-31'
		});
		expect(rangoDe('trimestre', HOY)).toEqual({ desde: '2026-10-01', hasta: HOY });
		expect(rangoDe('anio', HOY).desde).toBe('2026-01-01');
	});

	it('ordena un rango personalizado invertido', () => {
		expect(rangoDe('personalizado', HOY, { desde: '2026-05-10', hasta: '2026-05-01' })).toEqual({
			desde: '2026-05-01',
			hasta: '2026-05-10'
		});
	});

	it('compara contra el mismo tramo del período anterior', () => {
		expect(rangoPrevio(rangoDe('mes', HOY), 'mes')).toEqual({
			desde: '2026-10-01',
			hasta: '2026-10-12'
		});
		expect(rangoPrevio(rangoDe('mes_pasado', '2026-03-10'), 'mes_pasado')).toEqual({
			desde: '2026-01-01',
			hasta: '2026-01-31'
		});
		expect(rangoPrevio(rangoDe('anio', HOY), 'anio')).toEqual({
			desde: '2025-01-01',
			hasta: '2025-11-12'
		});
		expect(rangoPrevio(rangoDe('semana', HOY), 'semana')).toEqual({
			desde: '2026-11-02',
			hasta: '2026-11-05'
		});
		expect(rangoPrevio({ desde: '2026-10-01', hasta: '2026-10-10' })).toEqual({
			desde: '2026-09-21',
			hasta: '2026-09-30'
		});
	});

	it('elige la agrupación y completa los grupos sin datos', () => {
		const mes = { desde: '2026-10-01', hasta: '2026-10-31' };
		expect(agrupacionPara(mes)).toBe('day');
		expect(grupos(mes, 'day')).toHaveLength(31);
		expect(grupos({ desde: '2026-01-01', hasta: '2026-11-12' }, 'month')).toHaveLength(11);
		expect(grupos({ desde: '2026-11-04', hasta: '2026-11-12' }, 'week')).toEqual([
			'2026-11-02',
			'2026-11-09'
		]);
	});

	it('usa la fecha de Argentina', () => {
		expect(hoyLocal(new Date('2026-11-13T02:00:00Z'))).toBe('2026-11-12');
	});
});
