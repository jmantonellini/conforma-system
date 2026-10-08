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

export type LineaInicial = {
	id: number;
	producto_id: number | null;
	insumo_id: number | null;
	insumo_unidad: string | null;
	descripcion: string;
	cantidad: number;
	precio_unitario: number;
	precio_lista_unitario: number;
	margen_porcentaje: number | null;
	descuento_porcentaje: number | null;
	justificacion_descuento: string | null;
	costo_mano_obra: number | null;
	costo_materiales: number;
	insumos_snapshot: unknown;
};

export type ProductoOpcion = {
	id: number;
	nombre: string;
	costo_materiales: number | null;
	margen_porcentaje: number | null;
	precio_venta: number;
};

export type InsumoOpcion = {
	id: number;
	codigo: string;
	nombre: string;
	unidad: string;
	costo_unitario: number;
};

export type LineaEdicion = {
	idx: number;
	tipo: 'producto' | 'insumo' | 'personalizado';
	producto_id: string;
	insumo_id: number | string | undefined;
	unidad: string;
	insumos_snapshot: MaterialSnapshot[];
	descripcion: string;
	cantidad: number;
	precio_unitario: number;
	precio_lista_unitario: number;
	precio_minimo_unitario: number;
	margen_porcentaje: number;
	descuento_porcentaje: number;
	justificacion_descuento: string;
	costo_mano_obra: number;
	costo_materiales: number;
};
