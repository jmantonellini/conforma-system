export const FABRICACION_GRUPO = {
	PREPARACION: 'preparacion',
	ACTIVO: 'activo',
	PAUSADO: 'pausado',
	FINAL: 'final'
} as const;

export const ESTADO_INICIAL_FABRICACION = 'preparando_material';

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

export function rangosNumeros(numeros: (number | null)[]) {
	const ordenados = numeros.filter((n): n is number => n !== null).sort((a, b) => a - b);
	const rangos: string[] = [];
	for (let i = 0; i < ordenados.length; i++) {
		const inicio = ordenados[i];
		while (ordenados[i + 1] === ordenados[i] + 1) i++;
		const fin = ordenados[i];
		rangos.push(
			fin === inicio
				? String(inicio)
				: fin === inicio + 1
					? `${inicio}, ${fin}`
					: `${inicio} al ${fin}`
		);
	}
	return rangos.join(', ');
}

export const etiquetaUnidad = (unidad: { numero: number | null; numero_serie: string }) =>
	unidad.numero ? `N° ${unidad.numero}` : unidad.numero_serie;
