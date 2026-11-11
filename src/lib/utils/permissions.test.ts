import { describe, expect, it } from 'vitest';
import { can } from './permissions';
import { normalizarPrecioPendiente } from './precios';

describe('importes permission', () => {
	it('uses an explicit grant instead of a role name', () => {
		const user = { rol: { nombre: 'oficina_tecnica' } };
		const permisos = [{ modulo: 'importes', accion: 'view' }];

		expect(can(user, permisos, 'importes', 'view')).toBe(true);
	});

	it('denies access when the grant is missing', () => {
		const user = { rol: { nombre: 'ventas' } };

		expect(can(user, [], 'importes', 'view')).toBe(false);
	});

	it('keeps the admin bypass', () => {
		const user = { rol: { nombre: 'admin' } };

		expect(can(user, [], 'importes', 'view')).toBe(true);
	});

	it('converts an empty pending price into zero so the order can be created', () => {
		expect(normalizarPrecioPendiente('')).toBe(0);
		expect(normalizarPrecioPendiente(null)).toBe(0);
		expect(normalizarPrecioPendiente('1250,50')).toBe(1250.5);
	});
});
