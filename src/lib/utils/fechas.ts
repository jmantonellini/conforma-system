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

export function diasHasta(fecha: string | Date): number {
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const destino = new Date(fecha);
	destino.setHours(0, 0, 0, 0);
	return Math.round((destino.getTime() - hoy.getTime()) / 86_400_000);
}

export function fechaRelativa(fecha: string | Date | null): string {
	if (!fecha) return '';
	const dias = diasHasta(fecha);
	if (dias === 0) return 'Hoy';
	if (dias === 1) return 'Mañana';
	if (dias === -1) return 'Ayer';
	return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`;
}

export function avisoVencimiento(fecha: string | Date | null, diasAviso = 3) {
	if (!fecha) return null;
	const dias = diasHasta(fecha);
	return {
		texto: dias < 0 ? `Vencida · ${fechaRelativa(fecha)}` : fechaRelativa(fecha),
		clase: dias < 0 ? 'text-error' : dias <= diasAviso ? 'text-warning' : 'secundario'
	};
}

export function haceCuanto(fecha: string | Date | null, ahora = new Date()) {
	if (!fecha) return '';
	const minutos = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 60_000);
	if (minutos < 1) return 'Recién';
	if (minutos < 60) return `Hace ${minutos} min`;
	const horas = Math.floor(minutos / 60);
	if (horas < 24) return `Hace ${horas} h`;
	const dias = diasHasta(fecha);
	if (dias === -1) return 'Ayer';
	if (dias > -7) return `Hace ${-dias} días`;
	return formatearFecha(fecha);
}
