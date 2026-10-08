import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
	mapearFilaContactoExcel,
	normalizarCabecera
} from '../server/utils/contactos-importar-excel';
import { POST } from '../../routes/(app)/contactos/importar/+server';

describe('contactos excel import', () => {
	it('maps address and postal headers used in contact spreadsheets', () => {
		expect(normalizarCabecera('Código Postal')).toBe('codigo_postal');
		expect(normalizarCabecera('Calle')).toBe('calle');
		expect(normalizarCabecera('Número')).toBe('numero');
		expect(normalizarCabecera('Teléfono')).toBe('telefono');

		const fila = {
			'Razón Social': 'Acme SRL',
			'Código Postal': '5000',
			Calle: 'San Martín',
			Número: '123',
			Teléfono: '3511234567'
		};

		const mapped = mapearFilaContactoExcel(fila);
		expect(mapped.codigo_postal).toBe('5000');
		expect(mapped.calle).toBe('San Martín');
		expect(mapped.numero).toBe('123');
		expect(mapped.telefono).toBe('3511234567');
	});

	it('maps spreadsheet cells to their headers when validating the upload', async () => {
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet([
			['Razón Social', 'Rol'],
			['Acme SRL', 'cliente']
		]);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
		const archivo = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
		const formData = new FormData();
		formData.append('archivo', new File([archivo], 'CLIENTES.xlsx'));
		const request = new Request('http://localhost/contactos/importar', {
			method: 'POST',
			body: formData
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			filas: [{ razon_social: 'Acme SRL', rol: 'cliente' }],
			cantidad: 1
		});
	});
});
