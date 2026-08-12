export type ToastTypes = 'info' | 'success' | 'error';
export enum ToastTypeEnum {
	Info = 'info',
	Success = 'success',
	Error = 'error'
}

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

export type Toast = {
	id: number;
	type: ToastTypes;
	message: string;
	timeout?: number;
};

export enum Roles {
	ADMIN = 'admin',
	TECNICO = 'tecnico',
	OPERARIO = 'operario',
	VENTAS = 'ventas',
	JEFE_PLATA = 'jefe_plata'
}

export enum Modulos {
	PRODUCTOS = 'productos',
	CLIENTES = 'clientes',
	PEDIDOS = 'pedidos',
	FABRICACION = 'fabricacion',
	CONFIGURACION = 'configuracion',
	INVENTARIO = 'inventario',
	ENVIOS = 'envios'
}

export enum Paths {
	TAREAS = '/',
	LOGIN = '/login',
	PRODUCTOS = '/' + Modulos.PRODUCTOS,
	CLIENTES = '/' + Modulos.CLIENTES,
	PEDIDOS = '/' + Modulos.PEDIDOS,
	FABRICACION = '/' + Modulos.FABRICACION,
	INVENTARIO = '/' + Modulos.INVENTARIO,
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

export enum Acciones {
	CREATE = 'create',
	VIEW = 'view',
	EDIT = 'edit',
	DELETE = 'delete'
}

export type ModalType = 'create' | 'edit' | 'delete' | 'confirm';

export interface ModalState {
	open: boolean;
	type: ModalType;
	title: string;
	data?: unknown;
	onConfirm?: (data?: unknown) => Promise<void> | void;
	onCancel?: () => void;
}
