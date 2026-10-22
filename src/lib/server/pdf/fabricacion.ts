import { generate } from '@pdfme/generator';
import type { Template } from '@pdfme/common';
import { image, rectangle, text } from '@pdfme/schemas';
import sharp from 'sharp';
import type { getOrdenFabricacion } from '$lib/remote/fabricacion-consultas.remote';
import { leerObjeto } from '$lib/server/services/object-storage.service';
import { formatearFecha } from '$lib/utils/fechas';

type OrdenFabricacion = Awaited<ReturnType<typeof getOrdenFabricacion>>;
type Plano = {
	id: number;
	archivo_key: string;
	nombre_original: string;
	mime_type: string | null;
};
type EntradaPDF = Record<string, string>;
type SchemaPDF = Template['schemas'][number][number];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const RED = '#ed1c24';
const OSCURO = '#2b2b2b';
const TEXTO = '#222222';
const ETIQUETA = '#6b6b6b';
const FILA_CLARA = '#f1f1f1';
const BLANCO = '#ffffff';

const ALTO_CABECERA_TABLA = 8;

type OpcionesTexto = {
	size?: number;
	color?: string;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'middle' | 'bottom';
};
type Columna = { titulo: string; ancho: number; align?: 'left' | 'center' | 'right' };

/**
 * Una página del PDF. Cada campo recibe un nombre único a nivel de todo el documento
 * (prefijo con el id de página) para que pdfme los dibuje en el orden en que se crean:
 * primero los fondos (rectángulos) y encima el texto.
 */
class Pagina {
	schemas: SchemaPDF[] = [];
	input: EntradaPDF = {};
	private contador = 0;

	constructor(private readonly id: number) {}

	texto(
		x: number,
		y: number,
		width: number,
		height: number,
		valor: string,
		{ size = 10, color = TEXTO, align = 'left', valign = 'middle' }: OpcionesTexto = {}
	) {
		const name = `p${this.id}_t${this.contador++}`;
		this.schemas.push({
			name,
			type: 'text',
			position: { x, y },
			width,
			height,
			fontSize: size,
			fontColor: color,
			alignment: align,
			verticalAlignment: valign,
			lineHeight: 1.2,
			dynamicFontSize: { min: 6, max: size, fit: 'vertical' }
		} as SchemaPDF);
		this.input[name] = valor;
	}

	rect(x: number, y: number, width: number, height: number, color: string) {
		const name = `p${this.id}_r${this.contador++}`;
		this.schemas.push({
			name,
			type: 'rectangle',
			position: { x, y },
			width,
			height,
			color,
			borderWidth: 0,
			borderColor: '',
			readOnly: true
		} as SchemaPDF);
	}

	imagen(valor: string) {
		const name = `p${this.id}_img`;
		this.schemas.push({
			name,
			type: 'image',
			position: { x: 10, y: 10 },
			width: PAGE_WIDTH - 20,
			height: PAGE_HEIGHT - 20
		} as SchemaPDF);
		this.input[name] = valor;
	}
}

function prioridad(nombre: number | null) {
	return nombre === 2 ? 'Crítica' : nombre === 1 ? 'Urgente' : 'Normal';
}

function valor(dato: unknown) {
	return dato === null || dato === undefined || dato === '' ? '—' : String(dato);
}

function seccion(p: Pagina, titulo: string, y: number) {
	p.texto(MARGIN, y, CONTENT_WIDTH, 6, titulo, { size: 11, color: RED });
	p.rect(MARGIN, y + 6.5, CONTENT_WIDTH, 0.5, RED);
	return y + 10;
}

function filaTabla(
	p: Pagina,
	y: number,
	alto: number,
	columnas: Columna[],
	valores: string[],
	{ fondo, color = TEXTO, size }: { fondo?: string; color?: string; size: number }
) {
	if (fondo) p.rect(MARGIN, y, CONTENT_WIDTH, alto, fondo);
	let x = MARGIN;
	columnas.forEach((columna, indice) => {
		p.texto(x + 2, y, columna.ancho - 4, alto, valores[indice] ?? '', {
			size,
			color,
			align: columna.align
		});
		x += columna.ancho;
	});
}

// pdf-lib solo soporta JPEG y PNG. Se detecta el formato real por magic bytes
// (no por el mime_type guardado, que puede no coincidir con el contenido).
function esJPEG(b: Buffer) {
	return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function esPNG(b: Buffer) {
	return b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

async function prepararImagenPlano(contenido: Buffer) {
	if (esJPEG(contenido)) return `data:image/jpeg;base64,${contenido.toString('base64')}`;
	if (esPNG(contenido)) return `data:image/png;base64,${contenido.toString('base64')}`;
	// WebP, GIF, AVIF, TIFF, etc. → PNG (.rotate() aplica la orientación EXIF)
	const png = await sharp(contenido).rotate().png().toBuffer();
	return `data:image/png;base64,${png.toString('base64')}`;
}

export async function generarPDFFabricacion(orden: OrdenFabricacion, planos: Plano[]) {
	const medidas = orden.medidas;
	const observaciones = [orden.observaciones, medidas?.trombon_observaciones]
		.filter(Boolean)
		.join('\n');

	const paginas: Pagina[] = [];
	const nuevaPagina = () => {
		const pagina = new Pagina(paginas.length);
		paginas.push(pagina);
		return pagina;
	};

	// ───────── Página 1: encabezado ─────────
	const p = nuevaPagina();
	p.rect(MARGIN, 10, CONTENT_WIDTH, 16, RED);
	p.texto(MARGIN + 5, 10, 110, 16, 'ORDEN DE FABRICACIÓN', { size: 18, color: BLANCO });
	p.texto(PAGE_WIDTH - MARGIN - 5 - 56, 10, 56, 16, `OF-${orden.id}`, {
		size: 18,
		color: BLANCO,
		align: 'right'
	});
	p.texto(MARGIN, 30, CONTENT_WIDTH, 10, orden.nombre_trabajo, { size: 17 });

	// ───────── Datos del pedido (grilla de 4 columnas x 2 filas) ─────────
	const anchosGrilla = [38, 62, 38, 44];
	const anchosSegundaFila = [62, 52, 68];
	const fechaCreacion = formatearFecha(new Date(orden.created_at ?? Date.now()));
	const fechaEntrega = orden.fecha_fin_estimada
		? formatearFecha(new Date(orden.fecha_fin_estimada))
		: '—';
	const grilla: [string, string][][] = [
		[
			['PEDIDO', orden.pedido_numero || 'Sin pedido'],
			['CLIENTE', orden.cliente_nombre || '—'],
			['FECHA', fechaCreacion],
			['ENTREGA ESTIMADA', fechaEntrega]
		],
		[
			['CANTIDAD / PRODUCIDAS', `${orden.cantidad_total} / ${orden.cantidad_producida}`],
			['PRIORIDAD', prioridad(orden.prioridad)],
			['ASIGNADO', orden.empleado?.nombre || 'Sin asignar']
		]
	];
	const yGrilla = 44;
	p.rect(MARGIN, yGrilla, CONTENT_WIDTH, 30, FILA_CLARA);
	grilla.forEach((fila, indiceFila) => {
		let x = MARGIN;
		fila.forEach(([etiqueta, dato], indiceColumna) => {
			const yFila = yGrilla + 2 + indiceFila * 14;
			const ancho =
				indiceFila === 0 ? anchosGrilla[indiceColumna] : anchosSegundaFila[indiceColumna];
			p.texto(x + 3, yFila, ancho - 5, 4.5, etiqueta, {
				size: 8,
				color: ETIQUETA
			});
			p.texto(x + 3, yFila + 4.5, ancho - 5, 8, dato, { size: 12 });
			x += ancho;
		});
	});

	// ───────── Producto ─────────
	let y = seccion(p, 'PRODUCTO', yGrilla + 30 + 6);
	const codigoProducto = orden.producto?.codigo ? `${orden.producto.codigo} · ` : '';
	const nombreProducto =
		orden.producto?.nombre || orden.descripcion_producto || 'Trabajo personalizado';
	p.texto(MARGIN, y, CONTENT_WIDTH, 9, `${codigoProducto}${nombreProducto}`, { size: 14 });
	y += 9 + 5;

	// ───────── Medidas (tabla) ─────────
	y = seccion(p, 'MEDIDAS', y);
	const columnasMedidas: Columna[] = [
		{ titulo: 'SECCIÓN', ancho: 70 },
		{ titulo: 'DIÁMETRO', ancho: 56 },
		{ titulo: 'LARGO', ancho: 56 }
	];
	filaTabla(
		p,
		y,
		ALTO_CABECERA_TABLA,
		columnasMedidas,
		columnasMedidas.map((c) => c.titulo),
		{
			fondo: OSCURO,
			color: BLANCO,
			size: 10
		}
	);
	y += ALTO_CABECERA_TABLA;
	const filasMedidas = [
		['Primario', valor(medidas?.primario_diametro), valor(medidas?.primario_largo)],
		['Secundario', valor(medidas?.secundario_diametro), valor(medidas?.secundario_largo)],
		[
			'Trombón (diámetro inicial)',
			valor(medidas?.trombon_diametro_inicial),
			valor(medidas?.trombon_largo)
		]
	];
	filasMedidas.forEach((fila, indice) => {
		filaTabla(p, y, 9, columnasMedidas, fila, {
			fondo: indice % 2 === 1 ? FILA_CLARA : undefined,
			size: 12
		});
		y += 9;
	});
	y += 6;

	// ───────── Observaciones (solo si hay) ─────────
	if (observaciones) {
		y = seccion(p, 'OBSERVACIONES', y);
		const lineas = observaciones
			.split('\n')
			.reduce((total, linea) => total + Math.max(1, Math.ceil(linea.length / 95)), 0);
		const alto = Math.min(40, Math.max(8, lineas * 5.2));
		p.texto(MARGIN, y, CONTENT_WIDTH, alto, observaciones, { size: 10.5, valign: 'top' });
		y += alto + 6;
	}

	// ───────── Planos: una página por plano, solo la imagen ─────────
	for (const plano of planos) {
		const pagina = nuevaPagina();
		try {
			const contenido = Buffer.from(await leerObjeto(plano.archivo_key));
			pagina.imagen(await prepararImagenPlano(contenido));
		} catch (cause) {
			// Un plano ilegible (PDF, archivo corrupto, etc.) no debe tirar abajo todo el PDF.
			console.error(`No se pudo incluir el plano ${plano.id} (${plano.nombre_original}):`, cause);
			pagina.schemas = [];
			pagina.input = {};
			pagina.texto(
				MARGIN,
				MARGIN,
				CONTENT_WIDTH,
				10,
				'No se pudo cargar el plano (formato no soportado o archivo dañado).',
				{
					size: 11,
					valign: 'top'
				}
			);
		}
	}

	return generate({
		template: {
			basePdf: {
				width: PAGE_WIDTH,
				height: PAGE_HEIGHT,
				padding: [MARGIN, MARGIN, MARGIN, MARGIN] as [number, number, number, number]
			},
			schemas: paginas.map((pagina) => pagina.schemas)
		},
		// pdfme genera una copia completa del template por cada input: hay que pasar UN solo
		// input con los campos de todas las páginas (los nombres son únicos por página).
		inputs: [Object.assign({}, ...paginas.map((pagina) => pagina.input))],
		plugins: { text, image, rectangle }
	});
}
