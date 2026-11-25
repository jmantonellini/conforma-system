import XLSX from 'xlsx';

const DIA = 24 * 60 * 60 * 1000;

export const REASIGNACION_OF = {
	9999: { numero: '2012', nota: 'En la planilla figuraba como OF 9999' },
	54402: { numero: '5402', nota: 'Fila duplicada de cuentas a cobrar (OF 54402)', duplicada: true }
};
export const OF_ANEXAS = { '6197 A': '6197' };

export function leerHojas(archivo) {
	const libro = XLSX.readFile(archivo, { cellDates: true });
	const hojas = {};
	for (const nombre of [
		'OF DETALLE',
		'RESUMEN POR OF',
		'ESCAPES FABRICADOS',
		'COBROS',
		'PARA REVISAR'
	]) {
		const hoja = libro.Sheets[nombre];
		if (!hoja) throw new Error(`Falta la hoja "${nombre}" en ${archivo}`);
		const [encabezado, ...filas] = XLSX.utils.sheet_to_json(hoja, {
			header: 1,
			defval: null,
			raw: true
		});
		hojas[nombre] = filas
			.filter((fila) => fila.some((valor) => valor !== null && valor !== ''))
			.map((fila) => Object.fromEntries(encabezado.map((columna, i) => [columna, fila[i]])));
	}
	return hojas;
}

export function texto(valor) {
	if (valor === null || valor === undefined || typeof valor === 'boolean') return null;
	const limpio = String(valor).replace(/\s+/g, ' ').trim();
	return limpio && limpio !== '#¿NOMBRE?' ? limpio : null;
}

export function numero(valor) {
	if (valor === null || valor === undefined || valor === '') return null;
	const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

export function fechaISO(valor) {
	if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
		return new Date(valor.getTime() + DIA / 2).toISOString().slice(0, 10);
	}
	const t = texto(valor);
	if (!t) return null;
	const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
	const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
	const candidata = dmy
		? `${dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
		: iso && `${iso[1]}-${iso[2]}-${iso[3]}`;
	return fechaValida(candidata) ? candidata : null;
}

function fechaValida(fecha) {
	if (!fecha) return false;
	const valor = new Date(`${fecha}T12:00:00Z`);
	return !Number.isNaN(valor.getTime()) && valor.toISOString().startsWith(fecha);
}

export const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);
export const marcaTemporal = (fecha) => (fecha ? `${fecha}T12:00:00-03:00` : null);

export function numerosEscape(valor) {
	const t = texto(valor);
	return t ? [...t.matchAll(/\d+/g)].map((m) => Number(m[0])) : [];
}

export function unir(partes, separador = ' · ') {
	const vistos = new Set();
	const resultado = [];
	for (const parte of partes.flat()) {
		const t = texto(parte);
		if (t && !vistos.has(t.toUpperCase())) {
			vistos.add(t.toUpperCase());
			resultado.push(t);
		}
	}
	return resultado.join(separador) || null;
}

export function corregirFechasEscapes(escapes, hoy) {
	const ordenados = [...escapes].sort((a, b) => a.numero - b.numero);
	const conFecha = ordenados.filter((e) => e.fecha);
	const vecinos = (escape) => {
		const i = conFecha.findIndex((e) => e.numero >= escape.numero);
		const desde = Math.max(0, (i < 0 ? conFecha.length : i) - 5);
		return conFecha
			.slice(desde, desde + 11)
			.filter((e) => e !== escape)
			.map((e) => e.fecha)
			.sort();
	};
	for (const escape of ordenados) {
		const cercanas = vecinos(escape);
		if (!cercanas.length) continue;
		const mediana = cercanas[Math.floor(cercanas.length / 2)];
		if (escape.fecha && escape.fecha <= hoy && Math.abs(diasEntre(mediana, escape.fecha)) <= 300) {
			continue;
		}
		const conAnioVecino = escape.fecha && `${mediana.slice(0, 4)}${escape.fecha.slice(4)}`;
		if (
			conAnioVecino &&
			fechaValida(conAnioVecino) &&
			Math.abs(diasEntre(mediana, conAnioVecino)) <= 90
		) {
			escape.notas.push(`Fecha corregida: la planilla decía ${escape.fecha}`);
			escape.fecha = conAnioVecino;
		} else if (!escape.fecha || escape.fecha > hoy) {
			escape.notas.push(
				escape.fecha
					? `Fecha estimada: la planilla decía ${escape.fecha}`
					: 'Fecha estimada: la planilla no tenía fecha'
			);
			escape.fecha = mediana;
		}
	}
}

export function normalizarTransportista(valor, retiraEnFabrica) {
	const t = texto(valor);
	if (!t) return null;
	const n = t.toUpperCase();
	if (/^RETIR|^ENTREGAD|POR CONFORMA|^EN MANO/.test(n)) return retiraEnFabrica;
	if (n.startsWith('CREDIFIN')) return 'Credifin';
	if (n.replace(/\s/g, '').startsWith('VIACARGO')) return 'Via Cargo';
	return t
		.toLowerCase()
		.replace(/(^|\s)\S/g, (letra) => letra.toUpperCase())
		.slice(0, 120);
}

export function limpiarFactura(valor, estricto = false) {
	const t = texto(valor);
	if (!t || t === '0' || /^0*4-?$/.test(t.replace(/\s/g, ''))) return null;
	const comprobante = t.match(/^([A-Z]{1,3})?\s?(\d{4,5})\s*[-_]\s*(\d{5,9})/i);
	if (comprobante) {
		const prefijo = comprobante[1] ? `${comprobante[1].toUpperCase()} ` : '';
		return `${prefijo}${comprobante[2]}-${comprobante[3]}`;
	}
	if (estricto) return null;
	return t
		.replace(/\.pdf$/i, '')
		.replace(/_/g, ' ')
		.trim();
}

export function cotizador(cotizaciones) {
	const lista = cotizaciones
		.filter((c) => c.venta > 0)
		.map((c) => ({ fecha: c.fecha, venta: c.venta }))
		.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
	return (fecha) => {
		if (!fecha) return lista.at(-1).venta;
		let desde = 0;
		let hasta = lista.length - 1;
		if (fecha <= lista[0].fecha) return lista[0].venta;
		while (desde < hasta) {
			const medio = Math.ceil((desde + hasta) / 2);
			if (lista[medio].fecha <= fecha) desde = medio;
			else hasta = medio - 1;
		}
		return lista[desde].venta;
	};
}
