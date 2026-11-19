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

export const MODALIDADES_ENTREGA = ['sucursal', 'domicilio'] as const;
export type ModalidadEntrega = (typeof MODALIDADES_ENTREGA)[number];

export const ETIQUETA_MODALIDAD: Record<ModalidadEntrega, string> = {
	sucursal: 'Sucursal del transporte',
	domicilio: 'A domicilio'
};

export type DatosEntrega = {
	transportista: string | null;
	modalidad: ModalidadEntrega | null;
	direccion: string | null;
	localidad: string | null;
	provincia: string | null;
	codigo_postal: string | null;
	recibe: string | null;
	telefono: string | null;
	indicaciones: string | null;
	consumidor_final: boolean;
};

export const ENTREGA_VACIA: DatosEntrega = {
	transportista: null,
	modalidad: null,
	direccion: null,
	localidad: null,
	provincia: null,
	codigo_postal: null,
	recibe: null,
	telefono: null,
	indicaciones: null,
	consumidor_final: false
};

export const tieneDatosEntrega = (entrega: DatosEntrega) =>
	Object.values(entrega).some((valor) =>
		typeof valor === 'string' ? Boolean(valor.trim()) : Boolean(valor)
	);

export const retiraEnFabrica = (entrega: Pick<DatosEntrega, 'transportista'>) =>
	entrega.transportista?.trim().toLowerCase() === RETIRA_EN_FABRICA.toLowerCase();

export type FaltanteEntrega = 'transportista' | 'destino' | 'direccion';

export const ETIQUETA_FALTANTE: Record<FaltanteEntrega, string> = {
	transportista: 'transportista',
	destino: 'localidad de destino',
	direccion: 'dirección de entrega'
};

export function faltantesEntrega(entrega: DatosEntrega) {
	const faltan: FaltanteEntrega[] = [];
	if (!entrega.transportista?.trim()) faltan.push('transportista');
	if (retiraEnFabrica(entrega)) return faltan;
	if (!entrega.localidad?.trim() && !entrega.direccion?.trim()) faltan.push('destino');
	if (entrega.modalidad === 'domicilio' && !entrega.direccion?.trim()) faltan.push('direccion');
	return faltan;
}

export const localidadCompleta = (entrega: DatosEntrega) =>
	[entrega.localidad, entrega.provincia, entrega.codigo_postal && `CP ${entrega.codigo_postal}`]
		.filter(Boolean)
		.join(', ');

export const entregaCompleta = (entrega: DatosEntrega) => faltantesEntrega(entrega).length === 0;

export type OrigenEntrega = 'pedido' | 'cliente' | null;

export type EntregaGuardada = Omit<DatosEntrega, 'consumidor_final'> & {
	consumidor_final: boolean | null;
};

const normalizar = (entrega: EntregaGuardada): DatosEntrega => ({
	...entrega,
	consumidor_final: Boolean(entrega.consumidor_final)
});

export function resolverEntrega(
	propiaGuardada: EntregaGuardada,
	clienteGuardado: EntregaGuardada | null
) {
	const propia = normalizar(propiaGuardada);
	const cliente = clienteGuardado && normalizar(clienteGuardado);
	const origen: OrigenEntrega = tieneDatosEntrega(propia)
		? 'pedido'
		: cliente && tieneDatosEntrega(cliente)
			? 'cliente'
			: null;
	const datos = origen === 'pedido' ? propia : origen === 'cliente' ? cliente! : ENTREGA_VACIA;
	return { datos, origen, faltan: faltantesEntrega(datos) };
}
