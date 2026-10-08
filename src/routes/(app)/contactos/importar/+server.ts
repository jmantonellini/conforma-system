import { json } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import {
	booleano,
	mapearFilaContactoExcel,
	normalizar,
	normalizarCabecera,
	numero
} from '$lib/server/utils/contactos-importar-excel';

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
		const cabeceras = (filas.shift() ?? []).map(normalizarCabecera);
		if (!cabeceras.includes('razon_social')) {
			return json({ error: 'Falta la columna razón social' }, { status: 400 });
		}

		const errores: string[] = [];
		const datos = filas
			.filter((fila) => fila.some((celda) => String(celda).trim() !== ''))
			.map((fila, indice) => {
				const filaMapeada = Object.fromEntries(
					cabeceras.map((cabecera, columna) => [cabecera ?? '', fila[columna]])
				);
				const valor = (campo: string) => filaMapeada[campo];
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
					...mapearFilaContactoExcel(filaMapeada),
					razon_social: razonSocial,
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
