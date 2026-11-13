import type {
	MaterialSnapshot,
	NuevoInsumoComercial,
	TipoLineaComercial
} from '$lib/modulos/ventas/tipos';

export type { MaterialSnapshot } from '$lib/modulos/ventas/tipos';

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
	receta_pendiente?: boolean;
	costo_materiales: number | null;
	precio_venta: number | null;
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
	ref?: string;
	bloqueo?: string | null;
	receta_pendiente?: boolean;
	tipo: TipoLineaComercial;
	visible_cliente: boolean;
	producto_id: string;
	stock_ubicacion_id?: string;
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

export const llevaComposicion = (linea: Pick<LineaEdicion, 'tipo' | 'receta_pendiente'>) =>
	linea.tipo === 'concepto' || (linea.tipo === 'producto' && !!linea.receta_pendiente);

export const insumosAsociados = (linea: LineaEdicion) =>
	llevaComposicion(linea)
		? linea.insumos_snapshot
				.filter((material) => material.insumo_id != null)
				.map((material) => ({ insumo_id: Number(material.insumo_id), cantidad: material.cantidad }))
		: [];
