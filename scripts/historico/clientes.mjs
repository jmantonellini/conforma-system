const IGNORADAS = new Set([
	'SA',
	'SRL',
	'SAS',
	'SAU',
	'SACI',
	'SAIC',
	'SH',
	'SOC',
	'CIA',
	'Y',
	'DE',
	'LA',
	'EL',
	'LOS',
	'LAS',
	'DEL',
	'E',
	'HIJOS',
	'HNOS',
	'SACIF',
	'SAICF',
	'SCA',
	'SL',
	'LTDA'
]);

export function normalizar(valor) {
	return String(valor ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.replace(/\bS\s*\.?\s*R\s*\.?\s*L\b\.?/g, 'SRL')
		.replace(/\bS\s*\.?\s*A\s*\.?\s*S\b\.?/g, 'SAS')
		.replace(/\bS\s*\.\s*A\b\.?/g, 'SA')
		.replace(/[^A-Z0-9 ]/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/\b([A-Z0-9]) (?=[A-Z0-9]\b)/g, '$1')
		.trim();
}

export function limpiarNombreCliente(valor) {
	return String(valor ?? '')
		.replace(/\s+(PARA|P\/)\s*(EL\s+)?\d{1,2}\/\d{1,2}.*$/i, '')
		.replace(/\s*\((CLIENTE|PARTICULAR)\)\s*/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function palabras(valor) {
	return normalizar(valor)
		.split(' ')
		.filter((p) => p.length > 1 && !IGNORADAS.has(p))
		.map((p) => (p.length > 4 && p.endsWith('S') ? p.slice(0, -1) : p));
}

export const claveCliente = (nombre) =>
	[...new Set(palabras(limpiarNombreCliente(nombre)))].sort().join(' ');

const compacta = (nombre) => palabras(nombre).join('');

export class Clientes {
	constructor(contactos) {
		this.exactos = new Map();
		this.palabras = [];
		for (const contacto of contactos) this.indexar(contacto);
	}

	indexar(contacto) {
		const variantes = new Set([
			compacta(contacto.razon_social),
			compacta(`${contacto.nombre ?? ''} ${contacto.apellido ?? ''}`),
			compacta(`${contacto.apellido ?? ''} ${contacto.nombre ?? ''}`)
		]);
		for (const variante of variantes) {
			if (!variante) continue;
			const ids = this.exactos.get(variante) ?? [];
			ids.push(contacto.id);
			this.exactos.set(variante, ids);
		}
		this.palabras.push({
			id: contacto.id,
			palabras: new Set([
				...palabras(contacto.razon_social),
				...palabras(`${contacto.nombre ?? ''} ${contacto.apellido ?? ''}`)
			])
		});
	}

	buscar(nombre) {
		const limpio = limpiarNombreCliente(nombre);
		const exacto = this.exactos.get(compacta(limpio));
		if (exacto?.length) return { id: Math.min(...exacto), via: 'exacto' };
		const buscadas = [...new Set(palabras(limpio))];
		if (buscadas.length < 2) return null;
		const ids = new Set(
			this.palabras.filter((c) => buscadas.every((p) => c.palabras.has(p))).map((c) => c.id)
		);
		return ids.size === 1 ? { id: [...ids][0], via: 'palabras' } : null;
	}
}
