import * as XLSX from 'xlsx';
import { consultaDesdeUrl } from '$lib/modulos/reportes/consulta';
import { variacion } from '$lib/modulos/reportes/formato';
import { describirRango } from '$lib/modulos/reportes/periodos';
import { reporteDe } from '$lib/modulos/reportes/reportes.server';
import { SECCIONES_REPORTE } from '$lib/modulos/reportes/tipos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const consulta = consultaDesdeUrl(url.searchParams);
	const reporte = await reporteDe(consulta);
	const titulo = SECCIONES_REPORTE.find((s) => s.valor === reporte.seccion)?.etiqueta ?? 'Reporte';

	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		libro,
		XLSX.utils.aoa_to_sheet([
			[titulo, describirRango(reporte.rango)],
			['Comparado con', describirRango(reporte.previo)],
			[],
			['Indicador', 'Período', 'Período anterior', 'Variación'],
			...reporte.indicadores.map((i) => [
				i.etiqueta,
				i.valor,
				i.previo,
				variacion(i.valor, i.previo)
			])
		]),
		'Resumen'
	);
	XLSX.utils.book_append_sheet(
		libro,
		XLSX.utils.aoa_to_sheet([
			['Desde', reporte.serie.titulo],
			...reporte.serie.puntos.map((p) => [p.clave, p.valor])
		]),
		'Evolución'
	);
	for (const tabla of reporte.tablas) {
		XLSX.utils.book_append_sheet(
			libro,
			XLSX.utils.aoa_to_sheet([
				tabla.columnas.map((c) => c.etiqueta),
				...tabla.filas.map((fila) => tabla.columnas.map((c) => fila[c.clave] ?? null))
			]),
			tabla.titulo.slice(0, 31)
		);
	}

	const archivo = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
	const nombre = `reporte-${reporte.seccion}-${reporte.rango.desde}-${reporte.rango.hasta}.xlsx`;
	return new Response(archivo, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${nombre}"`
		}
	});
};
