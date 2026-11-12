const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const ESPECIALES = [
	'diez',
	'once',
	'doce',
	'trece',
	'catorce',
	'quince',
	'dieciséis',
	'diecisiete',
	'dieciocho',
	'diecinueve'
];
const VEINTES = [
	'veinte',
	'veintiuno',
	'veintidós',
	'veintitrés',
	'veinticuatro',
	'veinticinco',
	'veintiséis',
	'veintisiete',
	'veintiocho',
	'veintinueve'
];
const DECENAS = [
	'',
	'',
	'',
	'treinta',
	'cuarenta',
	'cincuenta',
	'sesenta',
	'setenta',
	'ochenta',
	'noventa'
];
const CENTENAS = [
	'',
	'ciento',
	'doscientos',
	'trescientos',
	'cuatrocientos',
	'quinientos',
	'seiscientos',
	'setecientos',
	'ochocientos',
	'novecientos'
];

function hastaCien(n: number): string {
	if (n < 10) return UNIDADES[n];
	if (n < 20) return ESPECIALES[n - 10];
	if (n < 30) return VEINTES[n - 20];
	const unidad = n % 10;
	return DECENAS[Math.floor(n / 10)] + (unidad ? ` y ${UNIDADES[unidad]}` : '');
}

function hastaMil(n: number): string {
	if (n === 100) return 'cien';
	const centena = Math.floor(n / 100);
	const resto = n % 100;
	return [CENTENAS[centena], resto ? hastaCien(resto) : ''].filter(Boolean).join(' ');
}

function enteroALetras(n: number): string {
	if (n === 0) return 'cero';
	const millones = Math.floor(n / 1_000_000);
	const miles = Math.floor((n % 1_000_000) / 1000);
	const resto = n % 1000;
	const partes: string[] = [];
	if (millones) partes.push(millones === 1 ? 'un millón' : `${enteroALetras(millones)} millones`);
	if (miles) partes.push(miles === 1 ? 'mil' : `${hastaMil(miles)} mil`);
	if (resto) partes.push(hastaMil(resto));
	return partes
		.join(' ')
		.replace(/veintiuno (mil|millones)/g, 'veintiún $1')
		.replace(/\buno (mil|millones)/g, 'un $1');
}

export function importeEnLetras(importe: number, moneda: string) {
	const redondeado = Math.round(Math.abs(importe) * 100);
	const enteros = Math.floor(redondeado / 100);
	const centavos = String(redondeado % 100).padStart(2, '0');
	return `${moneda} ${enteroALetras(enteros)} con ${centavos}/100`;
}
