import { generate } from '@pdfme/generator';
import { image, table, text } from '@pdfme/schemas';
import { db } from '$lib/server/db';
import {
	configuracion_empresa,
	cotizaciones,
	lineas_cotizacion,
	contactos
} from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { calcularIva21, formatearDosDecimales, redondearPrecio } from '$lib/utils/precios';
import { obtenerCotizacionDolarBNA } from '$lib/server/services/tipo-cambio-bna.service';
import { readFile } from 'fs/promises';
import path from 'path';
import logoUrl from '$lib/assets/Logo.png';

const BRAND_RED = '#ed1c24';
const logoCache = new Map<string, Promise<string>>();

async function cargarLogo(configuredUrl?: string | null) {
	const cacheKey = configuredUrl ?? '';
	let logo = logoCache.get(cacheKey);
	if (!logo) {
		logo = (async () => {
			const assetPath = logoUrl.replace(/^\//, '');
			const candidates = [
				configuredUrl ? path.resolve('static', configuredUrl.replace(/^\//, '')) : '',
				path.resolve('src/lib/assets/Logo.png'),
				path.resolve('.svelte-kit/output/client', assetPath),
				path.resolve('build/client', assetPath)
			];

			for (const candidate of candidates) {
				try {
					const content = await readFile(candidate);
					return `data:image/png;base64,${content.toString('base64')}`;
				} catch {
					continue;
				}
			}

			throw new Error('No se encontró el logo de Conforma');
		})();
		logoCache.set(cacheKey, logo);
	}
	try {
		return await logo;
	} catch (error) {
		logoCache.delete(cacheKey);
		throw error;
	}
}

// Template corregido para v6
const template = {
	// PDF base vacío de 210mm x 297mm (A4) con padding
	basePdf: {
		width: 210,
		height: 297,
		padding: [20, 20, 20, 20] as [number, number, number, number],
		staticSchema: [
			{
				name: 'footer',
				type: 'text',
				content: '{footer}',
				readOnly: true,
				position: { x: 20, y: 258 },
				width: 170,
				height: 16,
				fontSize: 8,
				fontColor: '#666',
				lineHeight: 1.2
			}
		]
	},
	schemas: [
		[
			{
				type: 'image',
				position: { x: 20, y: 20 },
				width: 75,
				height: 20,
				name: 'logo'
			},
			// Header
			{
				name: 'titulo',
				type: 'text',
				position: { x: 120, y: 20 },
				width: 70,
				height: 10,
				fontSize: 24,
				fontColor: BRAND_RED,
				fontStyle: 'bold'
			},
			{
				type: 'text',
				position: { x: 120, y: 32 },
				width: 70,
				height: 8,
				fontSize: 12,
				fontColor: '#666',
				name: 'numero'
			},

			// Datos empresa
			{
				type: 'text',
				position: { x: 20, y: 50 },
				width: 80,
				height: 30,
				fontSize: 9,
				lineHeight: 1.5,
				name: 'empresa'
			},

			// Datos cliente
			{
				type: 'text',
				position: { x: 110, y: 50 },
				width: 80,
				height: 6,
				fontSize: 10,
				fontColor: BRAND_RED,
				fontStyle: 'bold',
				name: 'clienteTitulo'
			},
			{
				type: 'text',
				position: { x: 110, y: 57 },
				width: 80,
				height: 25,
				fontSize: 9,
				lineHeight: 1.4,
				dynamicFontSize: { min: 7, max: 9, fit: 'vertical' },
				name: 'cliente'
			},

			// Tabla
			{
				type: 'table',
				position: { x: 20, y: 90 },
				width: 170,
				height: 60,
				showHead: true,
				head: ['Descripción', 'Cant.', 'P. Unit.', 'Subtotal'],
				headWidthPercentages: [53, 10, 18.5, 18.5],
				tableStyles: { borderWidth: 0.1, borderColor: '#e5e7eb' },
				headStyles: {
					alignment: 'left',
					verticalAlignment: 'middle',
					fontSize: 10,
					lineHeight: 1,
					characterSpacing: 0,
					fontColor: '#ffffff',
					backgroundColor: BRAND_RED,
					borderColor: '',
					borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
					padding: { top: 5, right: 5, bottom: 5, left: 5 }
				},
				bodyStyles: {
					alignment: 'left',
					verticalAlignment: 'middle',
					fontSize: 9,
					lineHeight: 1,
					characterSpacing: 0,
					fontColor: '#333333',
					backgroundColor: '',
					alternateBackgroundColor: '',
					borderColor: '#888888',
					borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
					padding: { top: 5, right: 5, bottom: 5, left: 5 }
				},
				columnStyles: { alignment: { 1: 'center', 2: 'right', 3: 'right' } },
				name: 'table'
			},

			// Total
			{
				type: 'text',
				position: { x: 120, y: 160 },
				width: 28,
				height: 8,
				fontSize: 12,
				fontStyle: 'bold',
				halign: 'right',
				name: 'totalLabel'
			},
			{
				type: 'text',
				position: { x: 150, y: 160 },
				width: 40,
				height: 8,
				fontSize: 14,
				fontStyle: 'bold',
				fontColor: BRAND_RED,
				halign: 'right',
				name: 'total'
			},

			// Footer
			{
				type: 'text',
				position: { x: 20, y: 178 },
				width: 170,
				height: 11,
				fontSize: 12,
				fontStyle: 'bold',
				fontColor: BRAND_RED,
				lineHeight: 1.1,
				verticalAlignment: 'top',
				name: 'vigencia'
			},
			{
				name: 'monedaInfo',
				type: 'text',
				position: { x: 20, y: 192 },
				width: 170,
				height: 18,
				fontSize: 9,
				dynamicFontSize: { min: 7, max: 9, fit: 'vertical' },
				fontColor: '#333',
				lineHeight: 1.2,
				verticalAlignment: 'top'
			},
			{
				name: 'condicionesTitulo',
				type: 'text',
				position: { x: 20, y: 215 },
				width: 170,
				height: 8,
				fontSize: 9,
				fontStyle: 'bold',
				fontColor: '#333',
				verticalAlignment: 'top'
			},
			{
				name: 'condicionesPago',
				type: 'text',
				position: { x: 20, y: 224 },
				width: 170,
				height: 28,
				fontSize: 9,
				dynamicFontSize: { min: 6, max: 9, fit: 'vertical' },
				fontColor: '#555',
				lineHeight: 1.2,
				verticalAlignment: 'top'
			}
		]
	]
};

export type MonedaPDFCotizacion = 'USD' | 'ARS';

export async function generarPDFCotizacion(
	cotizacionId: number,
	moneda: MonedaPDFCotizacion = 'USD'
): Promise<{
	pdf: Uint8Array;
	clienteNombre: string;
	fechaCotizacion: Date;
}> {
	const businessConfigPromise = Promise.resolve(
		db.select().from(configuracion_empresa).where(eq(configuracion_empresa.id, 1)).limit(1)
	);
	const logoPromise = businessConfigPromise.then(([config]) => cargarLogo(config?.logo_url));
	const tipoCambioPromise = moneda === 'ARS' ? obtenerCotizacionDolarBNA() : Promise.resolve(null);
	const [[cot], [businessConfig], lineas, logo, tipoCambio] = await Promise.all([
		db
			.select({
				id: cotizaciones.id,
				numero: cotizaciones.numero_cotizacion,
				precio_total: cotizaciones.precio_total,
				descuento_global_porcentaje: cotizaciones.descuento_global_porcentaje,
				incluir_iva: cotizaciones.incluir_iva,
				condiciones_pago: cotizaciones.condiciones_pago,
				descripcion: cotizaciones.descripcion,
				validez_dias: cotizaciones.validez_dias,
				created_at: cotizaciones.created_at,
				cliente_razon_social: contactos.razon_social,
				cliente_nombre: contactos.nombre,
				cliente_apellido: contactos.apellido,
				cliente_telefono: contactos.telefono,
				cliente_direccion: contactos.calle
			})
			.from(cotizaciones)
			.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
			.where(eq(cotizaciones.id, cotizacionId))
			.limit(1),
		businessConfigPromise,
		db
			.select({
				descripcion: lineas_cotizacion.descripcion,
				cantidad: lineas_cotizacion.cantidad,
				precio: lineas_cotizacion.precio_unitario,
				subtotal: lineas_cotizacion.subtotal,
				descripcion_snapshot: lineas_cotizacion.descripcion
			})
			.from(lineas_cotizacion)
			.where(
				and(
					eq(lineas_cotizacion.cotizacion_id, cotizacionId),
					eq(lineas_cotizacion.visible_cliente, true),
					isNull(lineas_cotizacion.insumo_id)
				)
			),
		logoPromise,
		tipoCambioPromise
	]);

	if (!cot) throw new Error('Cotización no encontrada');

	const totalBase = redondearPrecio(lineas.reduce((sum, linea) => sum + (linea.subtotal ?? 0), 0));
	const descuentoGlobalPorcentaje = cot.descuento_global_porcentaje ?? 0;
	const importeDescuento = redondearPrecio(totalBase * (descuentoGlobalPorcentaje / 100));
	const baseImponible = redondearPrecio(totalBase - importeDescuento);
	const importeIva = cot.incluir_iva ? calcularIva21(baseImponible) : 0;
	const total = cot.precio_total ?? redondearPrecio(baseImponible + importeIva);
	const condicionesPago =
		cot.condiciones_pago === null
			? '50% de anticipo al aprobar, saldo contra entrega.'
			: cot.condiciones_pago.trim();
	const simboloMoneda = moneda === 'USD' ? 'US$' : '$';
	const factorConversion = tipoCambio?.venta ?? 1;
	const formatearImporte = (importe: number) =>
		`${importe < 0 ? '-' : ''}${simboloMoneda}${formatearDosDecimales(Math.abs(importe) * factorConversion)}`;
	const nombreCompleto = [cot.cliente_nombre, cot.cliente_apellido]
		.filter(Boolean)
		.join(' ')
		.trim();
	const clienteNombre = cot.cliente_razon_social?.trim() || nombreCompleto || 'Cliente';
	const clienteDatos = [
		clienteNombre,
		...(nombreCompleto && nombreCompleto !== clienteNombre ? [nombreCompleto] : []),
		cot.cliente_telefono,
		cot.cliente_direccion
	]
		.filter(Boolean)
		.join('\n');

	const fechaCotizacion = cot.created_at ?? new Date();
	const vencimiento = new Date(fechaCotizacion);
	vencimiento.setDate(vencimiento.getDate() + (cot.validez_dias ?? 15));
	const fechaValidez = vencimiento.toLocaleDateString('es-AR', {
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	const businessName = businessConfig?.razon_social || 'Conforma';
	const businessDetails = [
		businessName,
		businessConfig?.cuit ? `CUIT: ${businessConfig.cuit}` : null,
		businessConfig?.direccion ? `Dirección: ${businessConfig.direccion}` : null,
		businessConfig?.telefono ? `Tel: ${businessConfig.telefono}` : null,
		businessConfig?.email ? `Email: ${businessConfig.email}` : null
	]
		.filter(Boolean)
		.join('\n');

	const inputs = [
		{
			logo,
			titulo: moneda === 'USD' ? 'COTIZACIÓN USD' : 'COTIZACIÓN ARS',
			numero: cot.numero,
			empresa: businessDetails,
			clienteTitulo: 'CLIENTE',
			cliente: clienteDatos,
			table: [
				...lineas.map((l) => [
					l.descripcion_snapshot,
					String(l.cantidad),
					formatearImporte(l.precio),
					formatearImporte(l.subtotal ?? l.cantidad * l.precio)
				]),
				...(descuentoGlobalPorcentaje > 0
					? [
							['Subtotal', '', '', formatearImporte(totalBase)],
							[
								`Descuento general (${formatearDosDecimales(descuentoGlobalPorcentaje)}%)`,
								'',
								'',
								formatearImporte(-importeDescuento)
							]
						]
					: []),
				...(cot.incluir_iva ? [['IVA (21%)', '', '', formatearImporte(importeIva)]] : [])
			],
			totalLabel: 'TOTAL:',
			total: formatearImporte(total),
			vigencia: `VIGENCIA: válida hasta el ${fechaValidez}`,
			monedaInfo:
				moneda === 'USD'
					? 'Importes expresados en dólares estadounidenses (USD). No se aplicó conversión a pesos.'
					: `Importes convertidos a pesos argentinos (ARS). Tipo de cambio aplicado: dólar billete vendedor del Banco Nación, $${formatearDosDecimales(tipoCambio!.venta)} por US$1.`,
			condicionesTitulo: condicionesPago ? 'CONDICIONES DE PAGO' : '',
			condicionesPago,
			footer: 'Conforma · Gracias por consultar.'
		}
	];

	// generate devuelve Uint8Array, no Buffer
	const pdf = await generate({ template, inputs, plugins: { text, table, image } });
	return { pdf, clienteNombre, fechaCotizacion };
}
