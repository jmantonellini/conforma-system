export type TipoLineaComercial = 'producto' | 'insumo' | 'concepto';

export type MaterialSnapshot = {
	insumo_id?: number | null;
	producto_id?: number | null;
	codigo?: string | null;
	nombre: string;
	cantidad: number;
	costo_unitario?: number;
	unidad?: string;
	subtotal?: number;
};

export type NuevoInsumoComercial = {
	nombre: string;
	tipo_id: number;
	categoria_id?: number;
	unidad_id: number;
	unidad: string;
	costo_unitario: number;
};
