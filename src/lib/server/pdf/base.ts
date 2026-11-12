import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { image, line, rectangle, table, text } from '@pdfme/schemas';

export type Schema = Template['schemas'][number][number];
export type Entradas = Record<string, string>;

export const A4 = { ancho: 210, alto: 297 };
export const MARGEN = 15;
export const ANCHO_UTIL = A4.ancho - MARGEN * 2;

export const COLOR = {
	marca: '#e3242b',
	tinta: '#1f2937',
	suave: '#4b5563',
	tenue: '#6b7280',
	linea: '#d1d5db',
	fondo: '#f3f4f6',
	blanco: '#ffffff'
};

const PLUGINS = { text, image, rectangle, line, table };

type OpcionesTexto = {
	tamano?: number;
	color?: string;
	alinear?: 'left' | 'center' | 'right';
	vertical?: 'top' | 'middle' | 'bottom';
	interlineado?: number;
	espaciado?: number;
	ajustar?: boolean;
};

export class Lienzo {
	readonly schemas: Schema[] = [];
	readonly entradas: Entradas = {};
	private contador = 0;

	constructor(private readonly prefijo: string) {}

	private nombre(tipo: string) {
		return `${this.prefijo}_${tipo}${this.contador++}`;
	}

	texto(
		x: number,
		y: number,
		ancho: number,
		alto: number,
		valor: string,
		{
			tamano = 9,
			color = COLOR.tinta,
			alinear = 'left',
			vertical = 'top',
			interlineado = 1.25,
			espaciado = 0,
			ajustar = false
		}: OpcionesTexto = {}
	) {
		const name = this.nombre('t');
		this.schemas.push({
			name,
			type: 'text',
			position: { x, y },
			width: ancho,
			height: alto,
			fontSize: tamano,
			fontColor: color,
			alignment: alinear,
			verticalAlignment: vertical,
			lineHeight: interlineado,
			characterSpacing: espaciado,
			...(ajustar && {
				dynamicFontSize: { min: Math.max(6, tamano - 3), max: tamano, fit: 'vertical' }
			})
		} as Schema);
		this.entradas[name] = valor;
	}

	etiqueta(x: number, y: number, ancho: number, valor: string, color = COLOR.tenue) {
		this.texto(x, y, ancho, 4, valor.toUpperCase(), { tamano: 7, color, espaciado: 0.4 });
	}

	rect(x: number, y: number, ancho: number, alto: number, color: string, borde?: string) {
		this.schemas.push({
			name: this.nombre('r'),
			type: 'rectangle',
			position: { x, y },
			width: ancho,
			height: alto,
			color,
			borderWidth: borde ? 0.25 : 0,
			borderColor: borde ?? '',
			radius: 0,
			readOnly: true
		} as Schema);
	}

	linea(x: number, y: number, ancho: number, color = COLOR.linea, grosor = 0.3) {
		this.schemas.push({
			name: this.nombre('l'),
			type: 'line',
			position: { x, y },
			width: ancho,
			height: grosor,
			color,
			readOnly: true
		} as Schema);
	}

	imagen(x: number, y: number, ancho: number, alto: number, datos: string) {
		const name = this.nombre('i');
		this.schemas.push({
			name,
			type: 'image',
			position: { x, y },
			width: ancho,
			height: alto
		} as Schema);
		this.entradas[name] = datos;
	}

	tabla(
		y: number,
		columnas: { titulo: string; ancho: number; alinear?: 'left' | 'center' | 'right' }[],
		filas: string[][],
		{ tamano = 8.5, relleno = 2.2 }: { tamano?: number; relleno?: number } = {}
	) {
		const name = this.nombre('tabla');
		const total = columnas.reduce((suma, c) => suma + c.ancho, 0);
		const altoLinea = tamano * 0.3528 * 1.2;
		const anchoCaracter = tamano * 0.3528 * 0.52;
		const lineas = (texto: string, columna: number) => {
			const ancho = (columnas[columna].ancho / total) * ANCHO_UTIL - 5;
			return Math.max(1, Math.ceil((texto.length * anchoCaracter) / ancho));
		};
		const altoCabecera = altoLinea + relleno * 2;
		const altoCuerpo = filas.reduce(
			(suma, fila) => suma + Math.max(...fila.map(lineas)) * altoLinea + relleno * 2,
			0
		);
		this.schemas.push({
			name,
			type: 'table',
			position: { x: MARGEN, y },
			width: ANCHO_UTIL,
			height: altoCabecera + altoCuerpo,
			showHead: true,
			repeatHead: true,
			head: columnas.map((c) => c.titulo.toUpperCase()),
			headWidthPercentages: columnas.map((c) => (c.ancho / total) * 100),
			tableStyles: { borderWidth: 0, borderColor: COLOR.linea },
			headStyles: {
				fontSize: 7,
				characterSpacing: 0.4,
				alignment: 'left',
				verticalAlignment: 'middle',
				lineHeight: 1,
				fontColor: COLOR.blanco,
				backgroundColor: COLOR.tinta,
				borderColor: '',
				borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
				padding: { top: relleno, right: 2.5, bottom: relleno, left: 2.5 }
			},
			bodyStyles: {
				fontSize: tamano,
				characterSpacing: 0,
				alignment: 'left',
				verticalAlignment: 'middle',
				lineHeight: 1.2,
				fontColor: COLOR.tinta,
				backgroundColor: '',
				alternateBackgroundColor: COLOR.fondo,
				borderColor: COLOR.linea,
				borderWidth: { top: 0, right: 0, bottom: 0.2, left: 0 },
				padding: { top: relleno, right: 2.5, bottom: relleno, left: 2.5 }
			},
			columnStyles: {
				alignment: Object.fromEntries(
					columnas.flatMap((c, i) => (c.alinear && c.alinear !== 'left' ? [[i, c.alinear]] : []))
				)
			}
		} as Schema);
		this.entradas[name] = JSON.stringify(filas);
		return y + altoCabecera + altoCuerpo;
	}
}

export const LIMITE_INFERIOR = A4.alto - 22;

export class Documento {
	readonly paginas: Lienzo[] = [];
	y = MARGEN;

	constructor(private readonly prefijo: string) {
		this.nueva();
	}

	get actual() {
		return this.paginas[this.paginas.length - 1];
	}

	nueva() {
		this.paginas.push(new Lienzo(`${this.prefijo}${this.paginas.length}`));
		this.y = MARGEN;
		return this.actual;
	}

	reservar(alto: number) {
		if (this.y + alto > LIMITE_INFERIOR && this.y > MARGEN) this.nueva();
		return this.actual;
	}
}

export function pie(contenido: string): Schema[] {
	return [
		{
			name: 'pie_linea',
			type: 'line',
			position: { x: MARGEN, y: A4.alto - 14 },
			width: ANCHO_UTIL,
			height: 0.3,
			color: COLOR.linea,
			readOnly: true
		},
		{
			name: 'pie_texto',
			type: 'text',
			content: contenido,
			readOnly: true,
			position: { x: MARGEN, y: A4.alto - 12.5 },
			width: ANCHO_UTIL - 30,
			height: 5,
			fontSize: 7,
			fontColor: COLOR.tenue
		},
		{
			name: 'pie_pagina',
			type: 'text',
			content: 'Página {currentPage} de {totalPages}',
			readOnly: true,
			position: { x: A4.ancho - MARGEN - 30, y: A4.alto - 12.5 },
			width: 30,
			height: 5,
			fontSize: 7,
			fontColor: COLOR.tenue,
			alignment: 'right'
		}
	] as Schema[];
}

export function generarPdf(paginas: Lienzo[], piePagina?: string) {
	return generate({
		template: {
			basePdf: {
				width: A4.ancho,
				height: A4.alto,
				padding: [MARGEN, MARGEN, 18, MARGEN],
				...(piePagina && { staticSchema: pie(piePagina) })
			},
			schemas: paginas.map((pagina) => pagina.schemas)
		},
		inputs: [Object.assign({}, ...paginas.map((pagina) => pagina.entradas))],
		plugins: PLUGINS
	});
}

let calentado: Promise<unknown> | null = null;

export function calentarMotorPdf() {
	calentado ??= (async () => {
		const lienzo = new Lienzo('calentar');
		lienzo.texto(MARGEN, MARGEN, 100, 10, 'Áéíóú ñ $ 1.234,56');
		lienzo.tabla(30, [{ titulo: 'a', ancho: 1 }], [['b']]);
		await generarPdf([lienzo], 'x');
	})().catch((error) => {
		calentado = null;
		console.error('[pdf] No se pudo precalentar el generador', error);
	});
	return calentado;
}
