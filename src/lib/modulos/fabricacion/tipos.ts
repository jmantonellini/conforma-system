export const FABRICACION_GRUPO = {
	PREPARACION: 'preparacion',
	ACTIVO: 'activo',
	PAUSADO: 'pausado',
	FINAL: 'final'
} as const;

export const ESTADO_FABRICACION = Object.freeze({
	PAUSADO: 'pausado',
	EN_PRODUCCION: 'en_produccion',
	LIMPIEZA: 'limpieza',
	TERMINADO: 'terminado'
} as const);

export const PRIORIDAD_FABRICACION = Object.freeze({
	NORMAL: 0,
	URGENTE: 1,
	CRITICA: 2
} as const);

export const ETIQUETA_PRIORIDAD: Record<number, { nombre: string; color: string }> = {
	[PRIORIDAD_FABRICACION.NORMAL]: { nombre: 'Normal', color: 'neutral' },
	[PRIORIDAD_FABRICACION.URGENTE]: { nombre: 'Urgente', color: 'warning' },
	[PRIORIDAD_FABRICACION.CRITICA]: { nombre: 'Crítica', color: 'error' }
};
