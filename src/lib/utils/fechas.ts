export function fechaInputManana(fecha = new Date()): string {
	const manana = new Date(fecha);
	manana.setDate(manana.getDate() + 1);
	const anio = manana.getFullYear();
	const mes = String(manana.getMonth() + 1).padStart(2, '0');
	const dia = String(manana.getDate()).padStart(2, '0');
	return `${anio}-${mes}-${dia}`;
}

export function estaVencido(fecha: string | Date | null): boolean {
	if (!fecha) return false;
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	return new Date(fecha) < hoy;
}

export function esEstaSemana(fecha: string | Date | null): boolean {
	if (!fecha) return false;
	const f = new Date(fecha);
	const hoy = new Date();
	const diffMs = f.getTime() - hoy.getTime();
	const diffDias = diffMs / (1000 * 60 * 60 * 24);
	return diffDias >= 0 && diffDias <= 7;
}

export function formatearFecha(fecha: string | Date | null): string {
	if (!fecha) return '-';
	return new Date(fecha).toLocaleDateString('es-AR');
}

export function formatearFechaHora(fecha: string | Date | null): string {
	if (!fecha) return '-';
	return new Date(fecha).toLocaleString('es-AR', {
		timeZone: 'America/Argentina/Buenos_Aires',
		dateStyle: 'short',
		timeStyle: 'short'
	});
}

/** Días calendario desde hoy hasta `fecha` (negativo si ya pasó). */
export function diasHasta(fecha: string | Date): number {
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const destino = new Date(fecha);
	destino.setHours(0, 0, 0, 0);
	return Math.round((destino.getTime() - hoy.getTime()) / 86_400_000);
}

/** "Hoy", "Mañana", "En 5 días", "Ayer", "Hace 3 días". */
export function fechaRelativa(fecha: string | Date | null): string {
	if (!fecha) return '';
	const dias = diasHasta(fecha);
	if (dias === 0) return 'Hoy';
	if (dias === 1) return 'Mañana';
	if (dias === -1) return 'Ayer';
	return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`;
}
