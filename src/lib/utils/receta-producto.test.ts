import { describe, expect, it } from 'vitest';
import { describeMaterialReceta, esMaterialSubproducto } from './receta-producto';

describe('receta-producto', () => {
	it('muestra la receta con cantidades y subproductos en formato legible', () => {
		const receta = [
			{ nombre: 'Harina', cantidad: 2, unidad: 'kg', subtotal: 200 },
			{ nombre: 'Masa base', cantidad: 1, producto_id: 42, subtotal: 0 }
		];

		expect(describeMaterialReceta(receta[0])).toBe('2 kg · Harina');
		expect(esMaterialSubproducto(receta[1])).toBe(true);
		expect(describeMaterialReceta(receta[1])).toBe('1 x · Masa base');
	});
});
