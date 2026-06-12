export type ToastTypes = 'info' | 'success' | 'error';
export enum ToastTypeEnum {
	Info = 'info',
	Success = 'success',
	Error = 'error'
}

export type Toast = {
	id: number;
	type: ToastTypes;
	message: string;
	timeout?: number;
};
