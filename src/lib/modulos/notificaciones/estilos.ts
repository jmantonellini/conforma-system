import type { NombreIcono } from '$lib/ui/Icono.svelte';

export type EstiloNotificacion = { icono: NombreIcono; clase: string; etiqueta: string };

const ESTILOS: Record<string, EstiloNotificacion> = {
	cotizacion: { icono: 'bandeja', clase: 'bg-info/15 text-info', etiqueta: 'Cotización' },
	pedido: { icono: 'archivo', clase: 'bg-primary/15 text-primary', etiqueta: 'Pedido' },
	fabricacion: { icono: 'ajustes', clase: 'bg-warning/15 text-warning', etiqueta: 'Fabricación' },
	tarea: { icono: 'check', clase: 'bg-success/15 text-success', etiqueta: 'Tarea' },
	envio: { icono: 'flecha', clase: 'bg-secondary/15 text-secondary', etiqueta: 'Envío' }
};

const GENERICO: EstiloNotificacion = {
	icono: 'campana',
	clase: 'bg-base-200 text-base-content/70',
	etiqueta: ''
};

export const estiloNotificacion = (modulo: string | null) => ESTILOS[modulo ?? ''] ?? GENERICO;
