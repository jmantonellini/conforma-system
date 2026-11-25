export const CATEGORIAS_PRODUCTO = Object.freeze({
	ESCAPES: 'escapes'
} as const);

export const TIPOS_USO_PRODUCTO = Object.freeze({
	COMPETENCIA: 'competencia'
} as const);

export const TIPOS_PIEZA = [
	'escape_completo',
	'multiple',
	'bajada',
	'downpipe',
	'trombon',
	'silenciador',
	'salida',
	'secundario',
	'otra'
] as const;
export type TipoPieza = (typeof TIPOS_PIEZA)[number];

export const ETIQUETA_TIPO_PIEZA: Record<TipoPieza, string> = {
	escape_completo: 'Escape completo',
	multiple: 'Múltiple',
	bajada: 'Bajada',
	downpipe: 'Downpipe',
	trombon: 'Trombón',
	silenciador: 'Silenciador',
	salida: 'Salida de escape',
	secundario: 'Secundario',
	otra: 'Otra pieza'
};
