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

export const ESTADO_PAGO = Object.freeze({
	SIN_PAGAR: 'sin_pagar',
	ANTICIPO: 'anticipo',
	PARCIAL: 'parcial',
	PAGADO: 'pagado'
} as const);
export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO];

export const METODO_PAGO = Object.freeze({
	EFECTIVO: 'efectivo',
	TRANSFERENCIA: 'transferencia',
	CHEQUE: 'cheque',
	CUOTAS: 'cuotas'
} as const);
export type MetodoPago = (typeof METODO_PAGO)[keyof typeof METODO_PAGO];

export const ESTADO_RESERVA = Object.freeze({
	RESERVADA: 'reservada',
	CONSUMIDA: 'consumida',
	LIBERADA: 'liberada'
} as const);

export const TIPO_LOG_PEDIDO = Object.freeze({
	ESTADO: 'estado',
	PAGO: 'pago',
	ENVIO: 'envio',
	ENTREGA: 'entrega'
} as const);

export const ESTADO_ENVIO = Object.freeze({
	ENTREGADO: 'entregado'
} as const);

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
