import { query } from '$app/server';
import { ConsultaReporteSchema } from './consulta';
import { reporteDe } from './reportes.server';

export const getReporte = query(ConsultaReporteSchema, reporteDe);
