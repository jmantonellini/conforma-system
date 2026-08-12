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
