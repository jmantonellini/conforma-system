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
	CONFIGURACION = 'configuracion'
}

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
