export enum Prioridades {
	BAJA = 'baja',
	MEDIA = 'media',
	ALTA = 'alta'
}

export enum EstadosTarea {
	PENDIENTE = 'pendiente',
	EN_PROGRESO = 'en_progreso',
	COMPLETADA = 'completada'
}

export const ESTADOS_TAREA = [
	{ valor: EstadosTarea.PENDIENTE, etiqueta: 'Pendiente', color: 'warning' },
	{ valor: EstadosTarea.EN_PROGRESO, etiqueta: 'En progreso', color: 'info' },
	{ valor: EstadosTarea.COMPLETADA, etiqueta: 'Completada', color: 'success' }
] as const;

export const PRIORIDADES_TAREA = [
	{ valor: Prioridades.ALTA, etiqueta: 'Alta', color: 'error' },
	{ valor: Prioridades.MEDIA, etiqueta: 'Media', color: 'warning' },
	{ valor: Prioridades.BAJA, etiqueta: 'Baja', color: 'neutral' }
] as const;

export const estadoTarea = (valor: EstadosTarea) => ESTADOS_TAREA.find((e) => e.valor === valor)!;
export const prioridadTarea = (valor: Prioridades) =>
	PRIORIDADES_TAREA.find((p) => p.valor === valor)!;
