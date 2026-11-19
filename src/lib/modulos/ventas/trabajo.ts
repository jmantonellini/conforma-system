export const TIPOS_TRABAJO = ['fabricacion', 'reparacion', 'copia'] as const;
export type TipoTrabajo = (typeof TIPOS_TRABAJO)[number];

export const ETIQUETA_TIPO_TRABAJO: Record<TipoTrabajo, string> = {
	fabricacion: 'Fabricación',
	reparacion: 'Reparación',
	copia: 'Copia de muestra'
};

export const TIPO_TRABAJO_COLOR: Record<TipoTrabajo, string> = {
	fabricacion: 'badge-ghost',
	reparacion: 'badge-warning',
	copia: 'badge-info'
};

export const recibePiezaDelCliente = (tipo: TipoTrabajo | null | undefined) =>
	tipo === 'reparacion' || tipo === 'copia';

export const RETIRA_EN_FABRICA = 'Retira en fábrica';

export type DatosEntrega = {
	transportista: string | null;
	direccion: string | null;
	localidad: string | null;
	recibe: string | null;
	telefono: string | null;
};

export const ENTREGA_VACIA: DatosEntrega = {
	transportista: null,
	direccion: null,
	localidad: null,
	recibe: null,
	telefono: null
};

export const tieneDatosEntrega = (entrega: DatosEntrega) =>
	Object.values(entrega).some((valor) => Boolean(valor?.trim()));

export function faltantesEntrega(entrega: DatosEntrega) {
	const faltan: string[] = [];
	if (!entrega.transportista?.trim()) faltan.push('transportista');
	if (entrega.transportista?.trim().toLowerCase() === RETIRA_EN_FABRICA.toLowerCase())
		return faltan;
	if (!entrega.direccion?.trim() && !entrega.localidad?.trim()) faltan.push('destino');
	return faltan;
}

export const entregaCompleta = (entrega: DatosEntrega) => faltantesEntrega(entrega).length === 0;

export type OrigenEntrega = 'pedido' | 'cliente' | null;

export function resolverEntrega(propia: DatosEntrega, cliente: DatosEntrega | null) {
	const origen: OrigenEntrega = tieneDatosEntrega(propia)
		? 'pedido'
		: cliente && tieneDatosEntrega(cliente)
			? 'cliente'
			: null;
	const datos = origen === 'pedido' ? propia : origen === 'cliente' ? cliente! : ENTREGA_VACIA;
	return { datos, origen, faltan: faltantesEntrega(datos) };
}
