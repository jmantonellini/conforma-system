export type TipoEntidadAdjunto = 'cotizacion' | 'pedido' | 'fabricacion' | 'producto';

export type Adjunto = {
	id: number;
	nombre_original: string;
	mime_type: string | null;
	es_plano: boolean;
	tamano_bytes: number | null;
	created_at: Date | null;
	propietario: {
		tipo: TipoEntidadAdjunto;
		id: number;
	};
};
