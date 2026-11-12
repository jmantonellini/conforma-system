export const TIPOS_MOVIMIENTO_STOCK = [
	{
		value: 'ingreso',
		label: 'Ingreso al depósito',
		origen: null,
		destino: 'deposito',
		requiereDistribuidor: false
	},
	{
		value: 'ajuste_salida',
		label: 'Ajuste de salida',
		origen: 'deposito',
		destino: null,
		requiereDistribuidor: false
	},
	{
		value: 'transferencia',
		label: 'Enviar a distribuidor',
		origen: 'deposito',
		destino: 'distribuidor',
		requiereDistribuidor: true
	},
	{
		value: 'devolucion',
		label: 'Devolución al depósito',
		origen: 'distribuidor',
		destino: 'deposito',
		requiereDistribuidor: true
	}
] as const;

export type TipoMovimientoStock = (typeof TIPOS_MOVIMIENTO_STOCK)[number]['value'];
export const UBICACIONES_STOCK = Object.freeze({
	DEPOSITO: 'deposito',
	DISTRIBUIDOR: 'distribuidor'
} as const);

export type TipoUbicacionStock = (typeof UBICACIONES_STOCK)[keyof typeof UBICACIONES_STOCK];

export const ETIQUETAS_MOVIMIENTO_STOCK = {
	produccion: 'Ingreso por fabricación',
	ingreso: 'Ingreso al depósito',
	transferencia: 'Envío a distribuidor',
	venta_distribuidor: 'Venta reportada por distribuidor',
	devolucion: 'Devolución',
	ajuste_entrada: 'Ajuste de entrada',
	ajuste_salida: 'Ajuste de salida',
	venta_pedido: 'Venta por Pedido'
} as const;

export type TipoMovimientoRegistradoStock = keyof typeof ETIQUETAS_MOVIMIENTO_STOCK;

export type StockDisponibilidad = {
	ubicacion_id: number;
	ubicacion_nombre: string;
	ubicacion_tipo: TipoUbicacionStock;
	producto_id: number;
	producto_codigo: string;
	producto_nombre: string;
	existencia: number;
	reservada: number;
	disponible: number;
};

export const ESTADO_RESERVA = Object.freeze({
	RESERVADA: 'reservada',
	CONSUMIDA: 'consumida',
	LIBERADA: 'liberada'
} as const);
