import type { TipoEntidadAdjunto } from './dominio';
export type { TipoEntidadAdjunto } from './dominio';

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
