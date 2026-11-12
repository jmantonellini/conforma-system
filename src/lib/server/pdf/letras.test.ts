import { describe, expect, it } from 'vitest';
import { importeEnLetras } from './letras';

describe('importeEnLetras', () => {
	it.each([
		[0, 'pesos cero con 00/100'],
		[1, 'pesos uno con 00/100'],
		[31_000, 'pesos treinta y un mil con 00/100'],
		[21.5, 'pesos veintiuno con 50/100'],
		[100, 'pesos cien con 00/100'],
		[115, 'pesos ciento quince con 00/100'],
		[1000, 'pesos mil con 00/100'],
		[21000, 'pesos veintiún mil con 00/100'],
		[928.22, 'pesos novecientos veintiocho con 22/100'],
		[1_250_340.05, 'pesos un millón doscientos cincuenta mil trescientos cuarenta con 05/100'],
		[3_000_000, 'pesos tres millones con 00/100']
	])('%s', (importe, esperado) => {
		expect(importeEnLetras(importe, 'pesos')).toBe(esperado);
	});
});
