import { ANCHO_UTIL, A4, COLOR, Documento, MARGEN, generarPdf } from '../../../server/pdf/base';
import { importeEnLetras } from '../../../server/pdf/letras';

export type Imagen = { datos: string; ancho: number; alto: number };

export type DatosPdfCotizacion = {
	numero: string;
	fecha: Date;
	validoHasta: Date;
	validezDias: number;
	moneda: 'USD' | 'ARS';
	tipoCambio: { venta: number; fecha: string; hora: string } | null;
	empresa: {
		razonSocial: string;
		cuit: string | null;
		direccion: string | null;
		telefono: string | null;
		email: string | null;
		logo: Imagen | null;
	};
	cliente: {
		razonSocial: string;
		contacto: string | null;
		cuit: string | null;
		direccion: string | null;
		telefono: string | null;
		email: string | null;
	};
	responsable: string | null;
	referencia: string | null;
	lineas: {
		codigo: string | null;
		descripcion: string;
		cantidad: number;
		precio: number;
		importe: number;
	}[];
	subtotal: number;
	descuentoPorcentaje: number;
	descuento: number;
	iva: number | null;
	total: number;
	condicionesPago: string;
};

const fecha = (valor: Date) =>
	valor.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

const decimales = new Intl.NumberFormat('es-AR', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
const cantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });

function encajar(imagen: Imagen, anchoMax: number, altoMax: number) {
	const escala = Math.min(anchoMax / imagen.ancho, altoMax / imagen.alto);
	return { ancho: imagen.ancho * escala, alto: imagen.alto * escala };
}

export function renderizarCotizacion(d: DatosPdfCotizacion) {
	const simbolo = d.moneda === 'USD' ? 'US$' : '$';
	const importe = (valor: number) =>
		`${valor < 0 ? '-' : ''}${simbolo} ${decimales.format(Math.abs(valor))}`;
	const doc = new Documento('cot');
	const p = doc.actual;
	const derecha = A4.ancho - MARGEN;

	if (d.empresa.logo) {
		const { ancho, alto } = encajar(d.empresa.logo, 55, 16);
		p.imagen(MARGEN, MARGEN, ancho, alto, d.empresa.logo.datos);
	} else {
		p.texto(MARGEN, MARGEN, 90, 10, d.empresa.razonSocial, { tamano: 16 });
	}
	p.texto(derecha - 85, MARGEN - 1, 85, 9, 'COTIZACIÓN', {
		tamano: 20,
		color: COLOR.marca,
		alinear: 'right',
		espaciado: 1
	});
	p.texto(derecha - 85, MARGEN + 8, 85, 6, d.numero, { tamano: 12, alinear: 'right' });

	const meta: [string, string][] = [
		['Fecha', fecha(d.fecha)],
		['Válida hasta', fecha(d.validoHasta)],
		['Moneda', d.moneda === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'],
		...(d.responsable ? [['Atendido por', d.responsable] as [string, string]] : [])
	];
	meta.forEach(([etiqueta, valor], i) => {
		const y = MARGEN + 16 + i * 4.6;
		p.texto(derecha - 75, y, 30, 4.6, etiqueta, { tamano: 8, color: COLOR.tenue });
		p.texto(derecha - 45, y, 45, 4.6, valor, { tamano: 8.5, alinear: 'right' });
	});

	p.texto(MARGEN, MARGEN + 19, 95, 5, d.empresa.razonSocial, { tamano: 10 });
	p.texto(
		MARGEN,
		MARGEN + 24.5,
		95,
		13,
		[
			d.empresa.cuit && `CUIT ${d.empresa.cuit}`,
			d.empresa.direccion,
			[d.empresa.telefono, d.empresa.email].filter(Boolean).join(' · ')
		]
			.filter(Boolean)
			.join('\n'),
		{ tamano: 8, color: COLOR.suave }
	);

	let y = MARGEN + 40;
	p.linea(MARGEN, y, ANCHO_UTIL, COLOR.marca, 0.6);
	y += 4;

	p.rect(MARGEN, y, ANCHO_UTIL, 27, COLOR.fondo);
	const mitad = MARGEN + ANCHO_UTIL / 2 + 2;
	p.etiqueta(MARGEN + 4, y + 3, 80, 'Cliente', COLOR.marca);
	p.texto(MARGEN + 4, y + 7.5, 85, 6, d.cliente.razonSocial, { tamano: 11, ajustar: true });
	p.texto(
		MARGEN + 4,
		y + 13.5,
		85,
		12,
		[d.cliente.cuit && `CUIT ${d.cliente.cuit}`, d.cliente.direccion].filter(Boolean).join('\n') ||
			'—',
		{ tamano: 8, color: COLOR.suave, ajustar: true }
	);
	p.etiqueta(mitad, y + 3, 80, 'Contacto', COLOR.marca);
	p.texto(
		mitad,
		y + 7.5,
		ANCHO_UTIL / 2 - 6,
		18,
		[d.cliente.contacto, d.cliente.telefono, d.cliente.email].filter(Boolean).join('\n') ||
			'Sin datos de contacto',
		{ tamano: 8.5, color: COLOR.suave, ajustar: true }
	);
	y += 31;

	if (d.referencia) {
		p.etiqueta(MARGEN, y, 80, 'Referencia');
		p.texto(MARGEN, y + 4, ANCHO_UTIL, 9, d.referencia, {
			tamano: 8.5,
			color: COLOR.suave,
			ajustar: true
		});
		y += 15;
	}

	doc.y = y;
	doc.y = doc.reservar(30).tabla(
		doc.y,
		[
			{ titulo: '#', ancho: 11, alinear: 'center' },
			{ titulo: 'Código', ancho: 30 },
			{ titulo: 'Descripción', ancho: 67 },
			{ titulo: 'Cant.', ancho: 16, alinear: 'right' },
			{ titulo: 'Precio unit.', ancho: 28, alinear: 'right' },
			{ titulo: 'Importe', ancho: 28, alinear: 'right' }
		],
		d.lineas.map((linea, i) => [
			String(i + 1),
			linea.codigo ?? '',
			linea.descripcion,
			cantidad.format(linea.cantidad),
			importe(linea.precio),
			importe(linea.importe)
		])
	);
	doc.y += 5;

	const totales: [string, string][] = [
		['Subtotal', importe(d.subtotal)],
		...(d.descuento
			? [
					[`Descuento (${decimales.format(d.descuentoPorcentaje)}%)`, importe(-d.descuento)] as [
						string,
						string
					]
				]
			: []),
		...(d.iva !== null
			? ([
					['Neto gravado', importe(d.subtotal - d.descuento)],
					['IVA 21%', importe(d.iva)]
				] as [string, string][])
			: [])
	];
	const xTotales = derecha - 78;
	const t = doc.reservar(totales.length * 5.5 + 12);
	y = doc.y;
	totales.forEach(([etiqueta, valor], i) => {
		t.texto(xTotales, y + i * 5.5, 40, 5.5, etiqueta, {
			tamano: 8.5,
			color: COLOR.suave,
			vertical: 'middle'
		});
		t.texto(derecha - 40, y + i * 5.5, 38, 5.5, valor, {
			tamano: 9,
			alinear: 'right',
			vertical: 'middle'
		});
	});
	const yTotal = y + totales.length * 5.5 + 1.5;
	t.rect(xTotales - 2, yTotal, 80, 9, COLOR.marca);
	t.texto(xTotales, yTotal, 40, 9, 'TOTAL', {
		tamano: 10,
		color: COLOR.blanco,
		vertical: 'middle',
		espaciado: 0.6
	});
	t.texto(derecha - 50, yTotal, 48, 9, importe(d.total), {
		tamano: 12,
		color: COLOR.blanco,
		alinear: 'right',
		vertical: 'middle'
	});

	t.etiqueta(MARGEN, y, 90, 'Son');
	t.texto(
		MARGEN,
		y + 4,
		ANCHO_UTIL - 86,
		12,
		importeEnLetras(d.total, d.moneda === 'USD' ? 'Dólares estadounidenses' : 'Pesos'),
		{ tamano: 8.5, color: COLOR.suave, ajustar: true }
	);
	doc.y = yTotal + 15;

	const condiciones = [
		`Validez de la oferta: ${d.validezDias} días, hasta el ${fecha(d.validoHasta)}.`,
		d.condicionesPago && `Forma de pago: ${d.condicionesPago}`,
		d.iva !== null
			? 'Los precios incluyen IVA (21%), detallado arriba.'
			: 'Los precios no incluyen IVA.',
		d.moneda === 'ARS' && d.tipoCambio
			? `Importes en pesos al tipo de cambio dólar billete vendedor del Banco Nación ($ ${decimales.format(d.tipoCambio.venta)} por US$ 1, ${d.tipoCambio.fecha} ${d.tipoCambio.hora}).`
			: 'Importes expresados en dólares estadounidenses (USD).',
		'Plazo de entrega: a confirmar al aprobar la cotización, según disponibilidad de materiales.'
	].filter(Boolean) as string[];
	const altoCondiciones = 6.5 + condiciones.length * 4.6 + 10;
	const c = doc.reservar(altoCondiciones);
	y = doc.y;
	c.etiqueta(MARGEN, y, 90, 'Condiciones comerciales', COLOR.marca);
	c.linea(MARGEN, y + 4.5, ANCHO_UTIL);
	c.texto(
		MARGEN,
		y + 6.5,
		ANCHO_UTIL,
		condiciones.length * 4.6 + 2,
		condiciones.map((linea) => `•  ${linea}`).join('\n'),
		{
			tamano: 8.5,
			color: COLOR.suave,
			interlineado: 1.35
		}
	);
	doc.y = y + altoCondiciones;
	const pie = [
		d.empresa.razonSocial,
		d.empresa.cuit && `CUIT ${d.empresa.cuit}`,
		d.empresa.telefono,
		d.empresa.email
	]
		.filter(Boolean)
		.join(' · ');
	return generarPdf(doc.paginas, `${pie} · Cotización ${d.numero}`);
}
