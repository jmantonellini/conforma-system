import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { combinar } = await import('./notificaciones.server');

describe('combinar', () => {
	it('une usuarios, empleados y permisos de varios grupos', () => {
		expect(
			combinar(
				{ usuarios: [1, null], empleados: [4] },
				{ usuarios: [2], permisos: [{ modulo: 'envios', accion: 'edit' }] },
				{}
			)
		).toEqual({
			usuarios: [1, null, 2],
			empleados: [4],
			permisos: [{ modulo: 'envios', accion: 'edit' }]
		});
	});
});
