import { json } from '@sveltejs/kit';
import * as XLSX from 'xlsx';

const normalizar = (valor: unknown) =>
	String(valor ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');

const encabezado = (valor: unknown) => {
	const nombre = normalizar(valor);
	const aliases: Record<string, string> = {
		codigo: 'codigo',
		code: 'codigo',
		nombre: 'nombre',
		descripcion: 'nombre',
		descripcion_del_insumo: 'nombre',
		tipo: 'tipo',
		unidad: 'unidad',
		uom: 'unidad',
		costo: 'costo_unitario',
		costo_unitario: 'costo_unitario',
		precio: 'costo_unitario',
		flete: 'flete_porcentaje',
		flete_porcentaje: 'flete_porcentaje',
		categoria: 'categoria',
		categoria_insumo: 'categoria',
		proveedor: 'proveedor',
		observaciones: 'observaciones',
		notas: 'observaciones'
	};
	return aliases[nombre];
};

const numero = (valor: unknown) => {
	if (typeof valor === 'number') return valor;
	const textoOriginal = String(valor ?? '')
		.trim()
		.replace(/%$/, '');
	const texto = textoOriginal.includes(',')
		? textoOriginal.replace(/\./g, '').replace(',', '.')
		: textoOriginal;
	return Number(texto);
};

const unidadCanonica = (valor: unknown) => {
	const texto = normalizar(valor);
	const aliases: Record<string, string> = {
		u: 'unidad',
		un: 'unidad',
		unid: 'unidad',
		mts: 'metro',
		mt: 'metro',
		m: 'metro',
		metros: 'metro',
		metro: 'metro',
		m2: 'm2',
		m3: 'm3',
		kgs: 'kg',
		kg: 'kg',
		gr: 'gramo',
		grs: 'gramo',
		gramos: 'gramo',
		lt: 'litro',
		lts: 'litro',
		litros: 'litro',
		h: 'hora',
		hs: 'hora',
		horas: 'hora',
		d: 'dia',
		dias: 'dia'
	};
	return aliases[texto] ?? texto;
};

export async function POST({ request }) {
	const formData = await request.formData();
	const archivo = formData.get('archivo');
	if (!(archivo instanceof File))
		return json({ error: 'Seleccioná un archivo Excel' }, { status: 400 });
	if (!/\.(xlsx|xls)$/i.test(archivo.name)) {
		return json({ error: 'El archivo debe ser .xlsx o .xls' }, { status: 400 });
	}

	try {
		const workbook = XLSX.read(Buffer.from(await archivo.arrayBuffer()), {
			type: 'buffer',
			raw: true
		});
		const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
		if (!primeraHoja) return json({ error: 'El Excel no contiene hojas' }, { status: 400 });
		const filas = XLSX.utils.sheet_to_json<unknown[]>(primeraHoja, {
			header: 1,
			raw: true,
			defval: ''
		});
		const cabeceras = (filas.shift() ?? []).map(encabezado);
		const requeridas = ['codigo', 'nombre', 'tipo', 'unidad', 'costo_unitario'];
		const faltantes = requeridas.filter((nombre) => !cabeceras.includes(nombre));
		if (faltantes.length)
			return json({ error: `Faltan columnas: ${faltantes.join(', ')}` }, { status: 400 });

		const errores: string[] = [];
		const datos = filas
			.filter((fila) => fila.some((celda) => String(celda).trim() !== ''))
			.map((fila, indice) => {
				const valor = (campo: string) => fila[cabeceras.indexOf(campo)];
				const unidad = unidadCanonica(valor('unidad'));
				const tipo = normalizar(valor('tipo'));
				const costo = numero(valor('costo_unitario'));
				const flete = numero(valor('flete_porcentaje') || 0);
				const codigo = String(valor('codigo')).trim();
				const nombre = String(valor('nombre')).trim();
				if (!codigo) errores.push(`Fila ${indice + 2}: código vacío`);
				if (!nombre) errores.push(`Fila ${indice + 2}: descripción vacía`);
				if (!unidad) errores.push(`Fila ${indice + 2}: unidad vacía`);
				if (!tipo) errores.push(`Fila ${indice + 2}: tipo vacío`);
				if (!Number.isFinite(costo) || costo < 0)
					errores.push(`Fila ${indice + 2}: costo inválido`);
				if (!Number.isFinite(flete) || flete < 0)
					errores.push(`Fila ${indice + 2}: flete inválido`);
				return {
					codigo,
					nombre,
					tipo,
					unidad,
					costo_unitario: costo,
					flete_porcentaje: flete,
					categoria: String(valor('categoria') ?? '').trim() || undefined,
					proveedor: String(valor('proveedor') ?? '').trim() || undefined,
					observaciones: String(valor('observaciones') ?? '').trim() || undefined
				};
			});
		if (errores.length)
			return json({ error: 'El archivo tiene errores', errores }, { status: 422 });
		return json({ filas: datos, cantidad: datos.length });
	} catch {
		return json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 });
	}
}
