export const ACCION_ADJUNTO = Object.freeze({
	CREAR: 'create',
	EDITAR: 'edit'
} as const);

export const ENTIDAD_ADJUNTO = Object.freeze({
	COTIZACION: 'cotizacion',
	PEDIDO: 'pedido',
	FABRICACION: 'fabricacion',
	PRODUCTO: 'producto'
} as const);
export type TipoEntidadAdjunto = (typeof ENTIDAD_ADJUNTO)[keyof typeof ENTIDAD_ADJUNTO];

export type CategoriaAdjunto = 'general' | 'plano' | 'portada';

export type Adjunto = {
	id: number;
	nombre_original: string;
	mime_type: string | null;
	categoria: CategoriaAdjunto;
	tamano_bytes: number | null;
	created_at: Date | null;
	propietario: {
		tipo: TipoEntidadAdjunto;
		id: number;
	};
};
