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
