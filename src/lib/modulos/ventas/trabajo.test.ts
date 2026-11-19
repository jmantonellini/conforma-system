import { describe, expect, it } from 'vitest';
import { ENTREGA_VACIA, faltantesEntrega, resolverEntrega } from './trabajo';

const entrega = (datos: Partial<typeof ENTREGA_VACIA>) => ({ ...ENTREGA_VACIA, ...datos });

describe('faltantesEntrega', () => {
	it('pide transportista y destino cuando no hay datos', () => {
		expect(faltantesEntrega(ENTREGA_VACIA)).toEqual(['transportista', 'destino']);
	});

	it('acepta la localidad o la dirección como destino', () => {
		expect(faltantesEntrega(entrega({ transportista: 'Vía Cargo', localidad: 'Salta' }))).toEqual(
			[]
		);
		expect(
			faltantesEntrega(entrega({ transportista: 'Credifin', direccion: 'Terminal sucursal 3' }))
		).toEqual([]);
	});

	it('pide la dirección cuando la entrega es a domicilio', () => {
		expect(
			faltantesEntrega(
				entrega({ transportista: 'Vía Cargo', localidad: 'Rafaela', modalidad: 'domicilio' })
			)
		).toEqual(['direccion']);
		expect(
			faltantesEntrega(
				entrega({ transportista: 'Vía Cargo', localidad: 'Rafaela', modalidad: 'sucursal' })
			)
		).toEqual([]);
	});

	it('no pide destino si retira en fábrica', () => {
		expect(faltantesEntrega(entrega({ transportista: 'retira en fábrica' }))).toEqual([]);
	});
});

describe('resolverEntrega', () => {
	const cliente = entrega({ transportista: 'Vía Cargo', localidad: 'Córdoba' });

	it('usa los datos propios del pedido antes que los del cliente', () => {
		const propia = entrega({ transportista: 'Credifin', localidad: 'Mendoza' });
		expect(resolverEntrega(propia, cliente)).toMatchObject({ origen: 'pedido', datos: propia });
	});

	it('toma los del cliente si el pedido no tiene', () => {
		expect(resolverEntrega(ENTREGA_VACIA, cliente)).toMatchObject({
			origen: 'cliente',
			datos: cliente,
			faltan: []
		});
	});

	it('cuenta consumidor final como dato propio del pedido', () => {
		const propia = { ...ENTREGA_VACIA, consumidor_final: true };
		expect(resolverEntrega(propia, cliente).origen).toBe('pedido');
	});

	it('trata consumidor final nulo como falso', () => {
		expect(
			resolverEntrega({ ...ENTREGA_VACIA, consumidor_final: null }, null).datos.consumidor_final
		).toBe(false);
	});

	it('marca faltantes si nadie tiene datos', () => {
		expect(resolverEntrega(ENTREGA_VACIA, null)).toMatchObject({
			origen: null,
			faltan: ['transportista', 'destino']
		});
	});
});
