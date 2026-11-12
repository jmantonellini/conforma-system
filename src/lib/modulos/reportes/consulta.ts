import * as v from 'valibot';
import { PERIODOS } from './periodos';
import { SECCIONES_REPORTE } from './tipos';

export const ConsultaReporteSchema = v.object({
	seccion: v.optional(v.picklist(SECCIONES_REPORTE.map((s) => s.valor)), 'ventas'),
	periodo: v.optional(v.picklist(PERIODOS.map((p) => p.valor)), 'mes'),
	desde: v.optional(v.string()),
	hasta: v.optional(v.string())
});

export type ConsultaReporte = v.InferOutput<typeof ConsultaReporteSchema>;

export function consultaDesdeUrl(params: URLSearchParams) {
	const resultado = v.safeParse(ConsultaReporteSchema, {
		seccion: params.get('seccion') ?? undefined,
		periodo: params.get('periodo') ?? undefined,
		desde: params.get('desde') ?? undefined,
		hasta: params.get('hasta') ?? undefined
	});
	return resultado.success ? resultado.output : v.parse(ConsultaReporteSchema, {});
}
