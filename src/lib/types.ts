export enum Prioridades {
	BAJA = 'baja',
	MEDIA = 'media',
	ALTA = 'alta'
}

export enum EstadosTarea {
	PENDIENTE = 'pendiente',
	EN_PROGRESO = 'en_progreso',
	COMPLETADA = 'completada'
}

export enum Modulos {
	PRODUCTOS = 'productos',
	CLIENTES = 'clientes',
	COTIZACIONES = 'cotizaciones',
	PEDIDOS = 'pedidos',
	FABRICACION = 'fabricacion',
	CONFIGURACION = 'configuracion',
	INVENTARIO = 'inventario',
	INSUMOS = 'insumos',
	ENVIOS = 'envios'
}

export enum Paths {
	TAREAS = '/',
	LOGIN = '/login',
	PRODUCTOS = '/' + Modulos.PRODUCTOS,
	CLIENTES = '/' + Modulos.CLIENTES,
	COTIZACIONES = '/' + Modulos.COTIZACIONES,
	PEDIDOS = '/' + Modulos.PEDIDOS,
	FABRICACION = '/' + Modulos.FABRICACION,
	INVENTARIO = '/' + Modulos.INVENTARIO,
	INSUMOS = '/' + Modulos.INSUMOS,
	ENVIOS = '/' + Modulos.ENVIOS,
	CONFIGURACION = '/' + Modulos.CONFIGURACION,
	CONFIGURACION_USUARIOS = '/' + Modulos.CONFIGURACION + '/usuarios',
	CONFIGURACION_ROLES = '/' + Modulos.CONFIGURACION + '/roles',
	CONFIGURACION_EMPLEADOS = '/' + Modulos.CONFIGURACION + '/empleados',
	CONFIGURACION_ESTADOS_FABRICACION = '/' + Modulos.CONFIGURACION + '/estados-fabricacion',
	CONFIGURACION_CATEGORIAS_PRODUCTOS = '/' + Modulos.CONFIGURACION + '/categorias-productos',
	CONFIGURACION_TIPOS_MATERIA_PRIMA = '/' + Modulos.CONFIGURACION + '/tipos-materia-prima',
	CONFIGURACION_ESTADOS_PEDIDOS = '/' + Modulos.CONFIGURACION + '/estados-pedidos'
}

export const FABRICACION_GRUPO = {
	PREPARACION: 'preparacion',
	ACTIVO: 'activo',
	PAUSADO: 'pausado',
	FINAL: 'final'
} as const;

export const PEDIDO_SLUG = {
	COMPLETADO: 'completado',
	EN_PRODUCCION: 'en_produccion',
	PENDIENTE: 'pendiente',
	PAUSADO: 'pausado',
	ENTREGADO: 'entregado'
} as const;
