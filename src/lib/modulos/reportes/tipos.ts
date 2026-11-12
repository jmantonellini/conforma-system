import type { Agrupacion, Rango } from './periodos';

export const SECCIONES_REPORTE = [
	{ valor: 'ventas', etiqueta: 'Ventas' },
	{ valor: 'cotizaciones', etiqueta: 'Cotizaciones' },
	{ valor: 'produccion', etiqueta: 'Producción' },
	{ valor: 'insumos', etiqueta: 'Consumo de insumos' }
] as const;

export type SeccionReporte = (typeof SECCIONES_REPORTE)[number]['valor'];
export type Formato = 'moneda' | 'numero' | 'porcentaje' | 'dias' | 'texto';
export type Valor = string | number | null;

export type Indicador = {
	etiqueta: string;
	valor: number | null;
	previo: number | null;
	formato: Formato;
	mejorSiSube?: boolean;
	ayuda?: string;
};

export type Serie = {
	titulo: string;
	formato: Formato;
	puntos: { clave: string; etiqueta: string; valor: number }[];
};

export type Tabla = {
	titulo: string;
	columnas: { clave: string; etiqueta: string; formato?: Formato }[];
	filas: Record<string, Valor>[];
	vacio?: string;
};

export type Reporte = {
	seccion: SeccionReporte;
	rango: Rango;
	previo: Rango;
	agrupacion: Agrupacion;
	indicadores: Indicador[];
	serie: Serie;
	tablas: Tabla[];
};
