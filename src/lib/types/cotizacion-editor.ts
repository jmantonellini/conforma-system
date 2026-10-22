import type {
	MaterialSnapshot,
	NuevoInsumoComercial,
	TipoLineaComercial
} from '$lib/types/linea-comercial';

export type { MaterialSnapshot } from '$lib/types/linea-comercial';

export type LineaInicial = {
	id: number;
	producto_id: number | null;
	insumo_id: number | null;
	visible_cliente: boolean;
	insumo_unidad: string | null;
	descripcion: string;
	cantidad: number;
	precio_unitario: number;
	precio_lista_unitario: number;
	costo_materiales: number;
	insumos_snapshot?: MaterialSnapshot[] | null;
};

export type ProductoOpcion = {
	id: number;
	nombre: string;
	costo_materiales: number | null;
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
	tipo: TipoLineaComercial;
	visible_cliente: boolean;
	producto_id: string;
	insumo_id: number | string | undefined;
	nuevo_insumo?: NuevoInsumoComercial;
	insumos_snapshot: MaterialSnapshot[];
	unidad: string;
	descripcion: string;
	cantidad: number;
	precio_unitario: number;
	precio_lista_unitario: number;
	precio_minimo_unitario: number;
	costo_materiales: number;
};
