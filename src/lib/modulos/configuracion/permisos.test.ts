import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PERMISOS_ESTANDAR } from './permisos';

describe('catálogo de permisos', () => {
	it('el seed crea exactamente los permisos estándar', () => {
		const seed = readFileSync('src/lib/server/db/seed.sql', 'utf8');
		const bloque = seed.slice(
			seed.indexOf('INSERT INTO permisos'),
			seed.indexOf(') AS datos(accion, modulo)')
		);
		const enSeed = [...bloque.matchAll(/\('(\w+)', '(\w+)'\)/g)].map(
			([, accion, modulo]) => `${modulo}.${accion}`
		);
		expect(enSeed.sort()).toEqual(PERMISOS_ESTANDAR.map((p) => `${p.modulo}.${p.accion}`).sort());
	});
});
