export enum Modulos {
	PRODUCTOS = 'productos',
	CONTACTOS = 'contactos',
	COTIZACIONES = 'cotizaciones',
	PEDIDOS = 'pedidos',
	FABRICACION = 'fabricacion',
	CONFIGURACION = 'configuracion',
	INSUMOS = 'insumos',
	STOCK = 'stock',
	ENVIOS = 'envios',
	TAREAS = 'tareas',
	REPORTES = 'reportes'
}

export enum Paths {
	INICIO = '/',
	TAREAS = '/tareas',
	LOGIN = '/login',
	PRODUCTOS = '/' + Modulos.PRODUCTOS,
	CONTACTOS = '/' + Modulos.CONTACTOS,
	COTIZACIONES = '/' + Modulos.COTIZACIONES,
	PEDIDOS = '/' + Modulos.PEDIDOS,
	FABRICACION = '/' + Modulos.FABRICACION,
	INSUMOS = '/' + Modulos.INSUMOS,
	STOCK = '/' + Modulos.STOCK,
	ENVIOS = '/' + Modulos.ENVIOS,
	REPORTES = '/' + Modulos.REPORTES,
	CONFIGURACION = '/' + Modulos.CONFIGURACION,
	CONFIGURACION_ESTADOS = '/' + Modulos.CONFIGURACION + '/estados',
	CONFIGURACION_EMPRESA = '/' + Modulos.CONFIGURACION + '/empresa',
	CONFIGURACION_USUARIOS = '/' + Modulos.CONFIGURACION + '/usuarios',
	CONFIGURACION_ROLES = '/' + Modulos.CONFIGURACION + '/roles',
	CONFIGURACION_EMPLEADOS = '/' + Modulos.CONFIGURACION + '/empleados',
	CONFIGURACION_ESTADOS_FABRICACION = '/' + Modulos.CONFIGURACION + '/estados-fabricacion',
	CONFIGURACION_CATEGORIAS_PRODUCTOS = '/' + Modulos.CONFIGURACION + '/categorias-productos',
	CONFIGURACION_TIPOS_MATERIA_PRIMA = '/' + Modulos.CONFIGURACION + '/tipos-materia-prima',
	CONFIGURACION_ESTADOS_PEDIDOS = '/' + Modulos.CONFIGURACION + '/estados-pedidos'
}
