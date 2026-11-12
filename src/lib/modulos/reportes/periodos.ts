export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

export const PERIODOS = [
	{ valor: 'semana', etiqueta: 'Esta semana' },
	{ valor: 'semana_pasada', etiqueta: 'Semana pasada' },
	{ valor: 'mes', etiqueta: 'Este mes' },
	{ valor: 'mes_pasado', etiqueta: 'Mes pasado' },
	{ valor: 'trimestre', etiqueta: 'Este trimestre' },
	{ valor: 'anio', etiqueta: 'Este año' },
	{ valor: 'ultimos_12', etiqueta: 'Últimos 12 meses' },
	{ valor: 'personalizado', etiqueta: 'Personalizado' }
] as const;

export type Periodo = (typeof PERIODOS)[number]['valor'];
export type Agrupacion = 'day' | 'week' | 'month';
export type Rango = { desde: string; hasta: string };

const DIA = 86_400_000;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const aFecha = (texto: string) => new Date(`${texto}T00:00:00Z`);
const aTexto = (fecha: Date) => fecha.toISOString().slice(0, 10);
const sumarDias = (texto: string, dias: number) =>
	aTexto(new Date(aFecha(texto).getTime() + dias * DIA));
const inicioMes = (anio: number, mes: number) => aTexto(new Date(Date.UTC(anio, mes, 1)));
const finMes = (anio: number, mes: number) => aTexto(new Date(Date.UTC(anio, mes + 1, 0)));

export const esFecha = (texto: string | null | undefined): texto is string =>
	!!texto && /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(aFecha(texto).getTime());

export function hoyLocal(ahora = new Date()) {
	return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(ahora);
}

function lunes(texto: string) {
	const dia = (aFecha(texto).getUTCDay() + 6) % 7;
	return sumarDias(texto, -dia);
}

export function rangoDe(periodo: Periodo, hoy: string, personalizado?: Partial<Rango>): Rango {
	const fecha = aFecha(hoy);
	const anio = fecha.getUTCFullYear();
	const mes = fecha.getUTCMonth();
	switch (periodo) {
		case 'semana':
			return { desde: lunes(hoy), hasta: hoy };
		case 'semana_pasada': {
			const desde = sumarDias(lunes(hoy), -7);
			return { desde, hasta: sumarDias(desde, 6) };
		}
		case 'mes_pasado':
			return { desde: inicioMes(anio, mes - 1), hasta: finMes(anio, mes - 1) };
		case 'trimestre':
			return { desde: inicioMes(anio, mes - (mes % 3)), hasta: hoy };
		case 'anio':
			return { desde: inicioMes(anio, 0), hasta: hoy };
		case 'ultimos_12':
			return { desde: inicioMes(anio, mes - 11), hasta: hoy };
		case 'personalizado': {
			const desde = esFecha(personalizado?.desde) ? personalizado.desde : inicioMes(anio, mes);
			const hasta = esFecha(personalizado?.hasta) ? personalizado.hasta : hoy;
			return desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde };
		}
		default:
			return { desde: inicioMes(anio, mes), hasta: hoy };
	}
}

function restarMeses(texto: string, meses: number) {
	const fecha = aFecha(texto);
	const objetivo = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() - meses, 1));
	const ultimo = new Date(
		Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)
	).getUTCDate();
	objetivo.setUTCDate(Math.min(fecha.getUTCDate(), ultimo));
	return aTexto(objetivo);
}

const MESES_ATRAS: Partial<Record<Periodo, number>> = {
	mes: 1,
	mes_pasado: 1,
	trimestre: 3,
	anio: 12,
	ultimos_12: 12
};

export function rangoPrevio({ desde, hasta }: Rango, periodo?: Periodo): Rango {
	const meses = periodo ? MESES_ATRAS[periodo] : undefined;
	if (meses) {
		const finPrevio = restarMeses(hasta, meses);
		const cierraMes = sumarDias(hasta, 1).endsWith('-01');
		const fecha = aFecha(finPrevio);
		return {
			desde: restarMeses(desde, meses),
			hasta: cierraMes ? finMes(fecha.getUTCFullYear(), fecha.getUTCMonth()) : finPrevio
		};
	}
	if (periodo === 'semana' || periodo === 'semana_pasada') {
		return { desde: sumarDias(desde, -7), hasta: sumarDias(hasta, -7) };
	}
	const dias = Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / DIA) + 1;
	const nuevoHasta = sumarDias(desde, -1);
	return { desde: sumarDias(nuevoHasta, -(dias - 1)), hasta: nuevoHasta };
}

export function agrupacionPara({ desde, hasta }: Rango): Agrupacion {
	const dias = (aFecha(hasta).getTime() - aFecha(desde).getTime()) / DIA + 1;
	if (dias <= 31) return 'day';
	if (dias <= 120) return 'week';
	return 'month';
}

export function inicioDeGrupo(texto: string, agrupacion: Agrupacion) {
	if (agrupacion === 'week') return lunes(texto);
	if (agrupacion === 'month') return `${texto.slice(0, 7)}-01`;
	return texto;
}

export function grupos(rango: Rango, agrupacion: Agrupacion) {
	const claves: string[] = [];
	let actual = inicioDeGrupo(rango.desde, agrupacion);
	while (actual <= rango.hasta) {
		claves.push(actual);
		if (agrupacion === 'month') {
			const fecha = aFecha(actual);
			actual = inicioMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
		} else {
			actual = sumarDias(actual, agrupacion === 'week' ? 7 : 1);
		}
	}
	return claves;
}

export function etiquetaGrupo(clave: string, agrupacion: Agrupacion) {
	const fecha = aFecha(clave);
	const dia = fecha.getUTCDate();
	const mes = MESES[fecha.getUTCMonth()];
	if (agrupacion === 'month') return `${mes} ${String(fecha.getUTCFullYear()).slice(2)}`;
	return agrupacion === 'week' ? `Sem. ${dia} ${mes}` : `${dia} ${mes}`;
}

export function describirRango({ desde, hasta }: Rango) {
	const formato = (texto: string) => {
		const fecha = aFecha(texto);
		return `${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]} ${fecha.getUTCFullYear()}`;
	};
	return desde === hasta ? formato(desde) : `${formato(desde)} – ${formato(hasta)}`;
}
