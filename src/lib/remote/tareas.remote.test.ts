import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { TareaSchema } from './tareas.schema';

describe('tareas.remote', () => {
	it('permite editar una tarea y archivarla', () => {
		const result = safeParse(TareaSchema, {
			titulo: 'Tarea actualizada',
			descripcion: 'Nueva descripción',
			archivada: true,
			fecha_entrega: '2026-10-20'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.output.archivada).toBe(true);
		}
	});
});
