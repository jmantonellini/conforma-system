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
	const aliases: Record<string, string> = {
		razon_social: 'razon_social',
		nombre_empresa: 'razon_social',
		nombre: 'nombre',
		apellido: 'apellido',
		cuit: 'cuit',
		email: 'email',
		correo: 'email',
		telefono: 'telefono',
		celular: 'telefono',
		rol: 'rol',
		tipo: 'rol',
		distribuidor: 'es_distribuidor',
		es_distribuidor: 'es_distribuidor',
		comision: 'porcentaje_compensacion',
		porcentaje_comision: 'porcentaje_compensacion',
		saldo: 'saldo_disponible',
		saldo_disponible: 'saldo_disponible',
		codigo_proveedor: 'codigo_proveedor',
		contacto_proveedor: 'contacto_proveedor',
		condiciones_pago: 'condiciones_pago'
	};
	return aliases[normalizar(valor)];
};

const numero = (valor: unknown) => {
	const texto = String(valor ?? '')
		.trim()
		.replace(/%$/, '');
	const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
	return Number(normalizado);
};

const booleano = (valor: unknown) =>
	['true', 'si', 'sí', '1', 'x', 'yes'].includes(normalizar(valor));

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
		const hoja = workbook.Sheets[workbook.SheetNames[0]];
		if (!hoja) return json({ error: 'El Excel no contiene hojas' }, { status: 400 });
		const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: '' });
		const cabeceras = (filas.shift() ?? []).map(encabezado);
		if (!cabeceras.includes('razon_social')) {
			return json({ error: 'Falta la columna razón social' }, { status: 400 });
		}

		const errores: string[] = [];
		const datos = filas
			.filter((fila) => fila.some((celda) => String(celda).trim() !== ''))
			.map((fila, indice) => {
				const valor = (campo: string) => fila[cabeceras.indexOf(campo)];
				const razonSocial = String(valor('razon_social') ?? '').trim();
				const rol = normalizar(valor('rol')) || 'ninguno';
				const porcentaje = numero(valor('porcentaje_compensacion') || 0);
				const saldo = numero(valor('saldo_disponible') || 0);
				if (!razonSocial) errores.push(`Fila ${indice + 2}: razón social vacía`);
				if (!['ninguno', 'cliente', 'proveedor', 'ambos'].includes(rol))
					errores.push(`Fila ${indice + 2}: rol inválido`);
				if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100)
					errores.push(`Fila ${indice + 2}: comisión inválida`);
				if (!Number.isFinite(saldo) || saldo < 0)
					errores.push(`Fila ${indice + 2}: saldo inválido`);
				return {
					razon_social: razonSocial,
					nombre: String(valor('nombre') ?? '').trim() || undefined,
					apellido: String(valor('apellido') ?? '').trim() || undefined,
					cuit: String(valor('cuit') ?? '').trim() || undefined,
					email: String(valor('email') ?? '').trim() || undefined,
					telefono: String(valor('telefono') ?? '').trim() || undefined,
					rol: rol as 'ninguno' | 'cliente' | 'proveedor' | 'ambos',
					es_distribuidor: booleano(valor('es_distribuidor')),
					porcentaje_compensacion: porcentaje,
					saldo_disponible: saldo,
					codigo_proveedor: String(valor('codigo_proveedor') ?? '').trim() || undefined,
					contacto_proveedor: String(valor('contacto_proveedor') ?? '').trim() || undefined,
					condiciones_pago: String(valor('condiciones_pago') ?? '').trim() || undefined
				};
			});
		if (errores.length)
			return json({ error: 'El archivo tiene errores', errores }, { status: 422 });
		return json({ filas: datos, cantidad: datos.length });
	} catch {
		return json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 });
	}
}
