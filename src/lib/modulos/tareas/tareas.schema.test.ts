import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { TareaSchema } from './tareas.schema';
import { EstadosTarea, Prioridades } from './tipos';

describe('TareaSchema', () => {
	it('convierte los ids vacíos en null y aplica los valores por defecto', () => {
		const resultado = safeParse(TareaSchema, { id: '', titulo: '  Comprar gas  ', asignado_a: '' });
		expect(resultado.success && resultado.output).toMatchObject({
			id: null,
			titulo: 'Comprar gas',
			asignado_a: null,
			estado: EstadosTarea.PENDIENTE,
			prioridad: Prioridades.MEDIA
		});
	});

	it('exige un título', () => {
		expect(safeParse(TareaSchema, { titulo: '   ' }).success).toBe(false);
	});

	it('acepta una tarea asignada con fecha y prioridad', () => {
		const resultado = safeParse(TareaSchema, {
			id: '4',
			titulo: 'Relevamiento',
			asignado_a: '2',
			prioridad: Prioridades.ALTA,
			fecha_entrega: '2026-12-01'
		});
		expect(resultado.success && resultado.output).toMatchObject({ id: 4, asignado_a: 2 });
	});
});
