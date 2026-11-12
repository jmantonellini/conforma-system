import {
	ANCHO_UTIL,
	A4,
	COLOR,
	Documento,
	Lienzo,
	MARGEN,
	generarPdf
} from '../../../server/pdf/base';
import type { ImagenPdf } from '../../../server/pdf/imagenes';

export type DatosPdfOrden = {
	id: number;
	trabajo: string;
	producto: string | null;
	pedido: string | null;
	cliente: string | null;
	esParaStock: boolean;
	emision: Date;
	entregaEstimada: Date | null;
	cantidad: number;
	terminadas: number;
	prioridad: { nombre: string; urgente: boolean };
	responsable: string | null;
	medidas: { nombre: string; valores: string }[];
	notas: string[];
	materiales: {
		codigo: string | null;
		nombre: string;
		cantidad: number;
		unidad: string;
		adicional: boolean;
	}[];
	empresa: { razonSocial: string; logo: ImagenPdf | null };
	planos: { nombre: string; imagen: ImagenPdf | null }[];
	impreso: Date;
};

const zona = { timeZone: 'America/Argentina/Buenos_Aires' } as const;
const fecha = (valor: Date) => valor.toLocaleDateString('es-AR', zona);
const fechaHora = (valor: Date) =>
	valor.toLocaleString('es-AR', { ...zona, dateStyle: 'short', timeStyle: 'short' });
const cantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });

function encajar(imagen: ImagenPdf, anchoMax: number, altoMax: number) {
	const escala = Math.min(anchoMax / imagen.ancho, altoMax / imagen.alto);
	return { ancho: imagen.ancho * escala, alto: imagen.alto * escala };
}

function titulo(p: Lienzo, y: number, texto: string) {
	p.etiqueta(MARGEN, y, ANCHO_UTIL, texto, COLOR.marca);
	p.linea(MARGEN, y + 4.5, ANCHO_UTIL);
	return y + 7;
}

export function renderizarOrden(d: DatosPdfOrden) {
	const doc = new Documento('of');
	const p = doc.actual;
	const derecha = A4.ancho - MARGEN;

	if (d.empresa.logo) {
		const { ancho, alto } = encajar(d.empresa.logo, 40, 11);
		p.imagen(MARGEN, MARGEN, ancho, alto, d.empresa.logo.datos);
	}
	const anchoCabecera = ANCHO_UTIL;
	p.texto(MARGEN, MARGEN + 13, anchoCabecera, 6, 'ORDEN DE FABRICACIÓN', {
		tamano: 10,
		color: COLOR.marca,
		espaciado: 1
	});
	p.texto(MARGEN, MARGEN + 18.5, anchoCabecera, 11, `OF-${d.id}`, { tamano: 26 });

	let y = MARGEN + 32;
	p.texto(MARGEN, y, ANCHO_UTIL, 7, d.trabajo, { tamano: 14, ajustar: true });
	if (d.producto) {
		p.texto(MARGEN, y + 7, ANCHO_UTIL, 5, d.producto, { tamano: 9, color: COLOR.suave });
	}
	y += 14;

	const datos: [string, string, boolean?][] = [
		['Pedido', d.esParaStock ? 'Stock interno' : (d.pedido ?? 'Sin pedido')],
		['Cliente', d.esParaStock ? '—' : (d.cliente ?? '—')],
		['Emisión', fecha(d.emision)],
		['Entrega estimada', d.entregaEstimada ? fecha(d.entregaEstimada) : 'Sin fecha'],
		['Cantidad', `${d.cantidad} ${d.cantidad === 1 ? 'unidad' : 'unidades'}`],
		['Terminadas', `${d.terminadas} de ${d.cantidad}`],
		['Prioridad', d.prioridad.nombre, d.prioridad.urgente],
		['Responsable', d.responsable ?? 'Sin asignar']
	];
	const anchoCelda = ANCHO_UTIL / 4;
	p.rect(MARGEN, y, ANCHO_UTIL, 26, COLOR.fondo);
	datos.forEach(([etiqueta, valor, destacado], i) => {
		const x = MARGEN + (i % 4) * anchoCelda + 4;
		const yCelda = y + 3 + Math.floor(i / 4) * 12;
		p.etiqueta(x, yCelda, anchoCelda - 6, etiqueta);
		p.texto(x, yCelda + 4, anchoCelda - 6, 6, valor, {
			tamano: 10,
			color: destacado ? COLOR.marca : COLOR.tinta,
			ajustar: true
		});
	});
	doc.y = y + 31;

	const seccion = (
		texto: string,
		filas: number,
		dibujar: (pagina: Lienzo, y: number) => number
	) => {
		const pagina = doc.reservar(7 + 8 + Math.min(filas, 3) * 9);
		doc.y = dibujar(pagina, titulo(pagina, doc.y, texto)) + 6;
	};

	if (d.medidas.length) {
		seccion('Medidas', d.medidas.length, (pagina, yy) =>
			pagina.tabla(
				yy,
				[
					{ titulo: 'Sección', ancho: 38 },
					{ titulo: 'Medidas', ancho: 142 }
				],
				d.medidas.map((m) => [m.nombre, m.valores]),
				{ tamano: 10.5, relleno: 2.8 }
			)
		);
	}

	if (d.materiales.length) {
		seccion(
			`Materiales para ${d.cantidad} ${d.cantidad === 1 ? 'unidad' : 'unidades'}`,
			d.materiales.length,
			(pagina, yy) =>
				pagina.tabla(
					yy,
					[
						{ titulo: 'Código', ancho: 28 },
						{ titulo: 'Insumo', ancho: 88 },
						{ titulo: 'Cantidad', ancho: 22, alinear: 'right' },
						{ titulo: 'Unidad', ancho: 28 },
						{ titulo: 'OK', ancho: 14, alinear: 'center' }
					],
					d.materiales.map((m) => [
						m.codigo ?? '',
						m.adicional ? `${m.nombre} · adicional del pedido` : m.nombre,
						cantidad.format(m.cantidad),
						m.unidad,
						''
					])
				)
		);
	}

	if (d.notas.length) {
		const alto = Math.min(
			45,
			d.notas.reduce((t, n) => t + Math.max(1, Math.ceil(n.length / 105)), 0) * 4.8 + 2
		);
		const pagina = doc.reservar(alto + 7);
		const yy = titulo(pagina, doc.y, 'Notas de fabricación');
		pagina.texto(MARGEN, yy, ANCHO_UTIL, alto, d.notas.join('\n'), {
			tamano: 9,
			color: COLOR.suave,
			ajustar: true
		});
		doc.y = yy + alto + 6;
	}

	const paginas = [...doc.paginas];
	d.planos.forEach((plano, i) => {
		const hoja = new Lienzo(`plano${i}`);
		hoja.texto(
			MARGEN,
			MARGEN - 3,
			ANCHO_UTIL - 30,
			6,
			`Plano ${i + 1} de ${d.planos.length} · ${plano.nombre}`,
			{
				tamano: 9,
				color: COLOR.suave
			}
		);
		hoja.texto(derecha - 30, MARGEN - 3, 30, 6, `OF-${d.id}`, { tamano: 9, alinear: 'right' });
		hoja.linea(MARGEN, MARGEN + 4, ANCHO_UTIL);
		if (plano.imagen) {
			const area = { x: MARGEN, y: MARGEN + 7, ancho: ANCHO_UTIL, alto: A4.alto - MARGEN - 7 - 20 };
			const { ancho, alto } = encajar(plano.imagen, area.ancho, area.alto);
			hoja.imagen(area.x + (area.ancho - ancho) / 2, area.y, ancho, alto, plano.imagen.datos);
		} else {
			hoja.texto(
				MARGEN,
				MARGEN + 12,
				ANCHO_UTIL,
				8,
				'No se pudo cargar este plano (formato no soportado o archivo dañado).',
				{
					tamano: 10,
					color: COLOR.marca
				}
			);
		}
		paginas.push(hoja);
	});

	return generarPdf(
		paginas,
		`${d.empresa.razonSocial} · OF-${d.id} · ${d.trabajo} · Impreso el ${fechaHora(d.impreso)}`
	);
}
