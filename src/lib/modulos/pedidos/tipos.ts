export const PEDIDO_SLUG = {
	COMPLETADO: 'completado',
	EN_PRODUCCION: 'en_produccion',
	PENDIENTE: 'pendiente',
	PAUSADO: 'pausado',
	ENTREGADO: 'entregado',
	CANCELADO: 'cancelado',
	DEMORADO: 'demorado'
} as const;

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

export const TIPO_LOG_PEDIDO = Object.freeze({
	ESTADO: 'estado',
	PAGO: 'pago',
	ENVIO: 'envio',
	ENTREGA: 'entrega'
} as const);

export const ESTADO_ENVIO = Object.freeze({
	ENTREGADO: 'entregado'
} as const);
