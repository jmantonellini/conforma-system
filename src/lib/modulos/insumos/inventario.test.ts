import { describe, expect, it } from 'vitest';
import { hayStockSuficiente } from './inventario';

describe('hayStockSuficiente', () => {
	it('allows a decimal quantity when the available stock covers it', () => {
		expect(hayStockSuficiente(0.1 + 0.2, 0.3)).toBe(true);
	});

	it('rejects a consumption larger than the available stock', () => {
		expect(hayStockSuficiente(2.5, 2.5001)).toBe(false);
	});
});
