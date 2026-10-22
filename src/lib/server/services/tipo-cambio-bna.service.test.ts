import { describe, expect, it } from 'vitest';
import { CotizacionBNAError, parsearCotizacionDolarBNA } from './tipo-cambio-bna.service';

describe('parsearCotizacionDolarBNA', () => {
	it('reads the billete sell rate, publication date, and update time', () => {
		const html = `
			<div class="tab-pane fade in active" id="billetes">
				<table class="table cotizacion">
					<thead><tr><th class="fechaCot">22/10/2026</th><th>Compra</th><th>Venta</th></tr></thead>
					<tbody><tr><td class="tit">Dolar U.S.A</td><td>1.495,00</td><td>1.545,00</td></tr></tbody>
				</table>
				<div class="legal">Hora Actualización: 17:02</div>
			</div>
			<div class="tab-pane fade" id="divisas"></div>
		`;

		expect(parsearCotizacionDolarBNA(html)).toEqual({
			venta: 1545,
			fecha: '22/10/2026',
			hora: '17:02'
		});
	});

	it('rejects pages without the official billete rate', () => {
		expect(() => parsearCotizacionDolarBNA('<html></html>')).toThrow(CotizacionBNAError);
	});
});
