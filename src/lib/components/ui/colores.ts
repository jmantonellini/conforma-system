/**
 * Los colores de estados vienen de la base (`estados.color`), así que las clases no pueden
 * armarse con plantillas (`badge-${color}`): Tailwind no las detectaría. Este mapa las deja literales.
 */
const COLORES = {
	primary: { badge: 'badge-primary', status: 'status-primary' },
	secondary: { badge: 'badge-secondary', status: 'status-secondary' },
	accent: { badge: 'badge-accent', status: 'status-accent' },
	neutral: { badge: 'badge-neutral', status: 'status-neutral' },
	info: { badge: 'badge-info', status: 'status-info' },
	success: { badge: 'badge-success', status: 'status-success' },
	warning: { badge: 'badge-warning', status: 'status-warning' },
	error: { badge: 'badge-error', status: 'status-error' }
} as const;

type Color = keyof typeof COLORES;

/** Opciones para elegir el color de un estado. */
export const OPCIONES_COLOR: { valor: Color; nombre: string }[] = [
	{ valor: 'neutral', nombre: 'Gris' },
	{ valor: 'info', nombre: 'Celeste' },
	{ valor: 'primary', nombre: 'Azul' },
	{ valor: 'secondary', nombre: 'Violeta' },
	{ valor: 'accent', nombre: 'Turquesa' },
	{ valor: 'success', nombre: 'Verde' },
	{ valor: 'warning', nombre: 'Amarillo' },
	{ valor: 'error', nombre: 'Rojo' }
];

const resolver = (color: string | null | undefined) =>
	COLORES[(color ?? '') as Color] as (typeof COLORES)[Color] | undefined;

export const claseBadge = (color: string | null | undefined) => resolver(color)?.badge ?? '';
export const claseStatus = (color: string | null | undefined) =>
	resolver(color)?.status ?? 'status-neutral';
