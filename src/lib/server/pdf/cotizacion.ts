import { generate } from '@pdfme/generator';
import { table, text } from '@pdfme/schemas';
import { db } from '$lib/server/db';
import { cotizaciones, lineas_cotizacion, productos, clientes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Template corregido para v6
const template = {
	// PDF base vacío de 210mm x 297mm (A4) con padding
	basePdf: {
		width: 210,
		height: 297,
		padding: [20, 20, 20, 20]
	},
	schemas: [
		[
			// Header
			{
				name: 'titulo',
				type: 'text',
				position: { x: 120, y: 20 },
				width: 70,
				height: 10,
				fontSize: 24,
				fontColor: '#1e40af',
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
				position: { x: 120, y: 50 },
				width: 70,
				height: 6,
				fontSize: 10,
				fontColor: '#1e40af',
				fontStyle: 'bold',
				name: 'clienteTitulo'
			},
			{
				type: 'text',
				position: { x: 120, y: 57 },
				width: 70,
				height: 25,
				fontSize: 9,
				lineHeight: 1.4,
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
				headWidthPercentages: [58.8, 11.8, 14.7, 14.7],
				tableStyles: { borderWidth: 0.1, borderColor: '#e5e7eb' },
				headStyles: {
					alignment: 'left',
					verticalAlignment: 'middle',
					fontSize: 10,
					lineHeight: 1,
					characterSpacing: 0,
					fontColor: '#ffffff',
					backgroundColor: '#1e40af',
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
				position: { x: 130, y: 160 },
				width: 30,
				height: 8,
				fontSize: 12,
				fontStyle: 'bold',
				halign: 'right',
				name: 'totalLabel'
			},
			{
				type: 'text',
				position: { x: 165, y: 160 },
				width: 25,
				height: 8,
				fontSize: 14,
				fontStyle: 'bold',
				fontColor: '#1e40af',
				halign: 'right',
				name: 'total'
			},

			// Footer
			{
				type: 'text',
				position: { x: 20, y: 270 },
				width: 170,
				height: 20,
				fontSize: 8,
				fontColor: '#666',
				lineHeight: 1.4,
				name: 'footer'
			}
		]
	]
};

export async function generarPDFCotizacion(cotizacionId: number): Promise<Uint8Array> {
	const [cot] = await db
		.select({
			id: cotizaciones.id,
			numero: cotizaciones.numero_cotizacion,
			cliente_nombre: cotizaciones.cliente_nombre,
			cliente_telefono: cotizaciones.cliente_telefono,
			descripcion: cotizaciones.descripcion,
			validez_dias: cotizaciones.validez_dias,
			created_at: cotizaciones.created_at,
			cliente: {
				nombre: clientes.nombre,
				apellido: clientes.apellido,
				razon_social: clientes.razon_social,
				telefono: clientes.telefono,
				direccion: clientes.calle
			}
		})
		.from(cotizaciones)
		.leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
		.where(eq(cotizaciones.id, cotizacionId))
		.limit(1);

	if (!cot) throw new Error('Cotización no encontrada');

	const lineas = await db
		.select({
			descripcion: lineas_cotizacion.descripcion,
			cantidad: lineas_cotizacion.cantidad,
			precio: lineas_cotizacion.precio_unitario,
			subtotal: lineas_cotizacion.subtotal,
			producto_nombre: productos.nombre
		})
		.from(lineas_cotizacion)
		.leftJoin(productos, eq(lineas_cotizacion.producto_id, productos.id))
		.where(eq(lineas_cotizacion.cotizacion_id, cotizacionId));

	const total = lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0);
	const clienteNombre =
		cot.cliente?.razon_social ||
		`${cot.cliente?.nombre ?? ''} ${cot.cliente?.apellido ?? ''}`.trim() ||
		cot.cliente_nombre;

	const vencimiento = new Date(cot.created_at ?? Date.now());
	vencimiento.setDate(vencimiento.getDate() + (cot.validez_dias ?? 15));

	const inputs = [
		{
			titulo: 'COTIZACIÓN',
			numero: cot.numero,
			empresa:
				'Conforma SRL\nCUIT: XX-XXXXXXXX-X\nDirección: Av. Ejemplo 1234\nTel: (011) 5555-5555\nEmail: ventas@conforma.com',
			clienteTitulo: 'CLIENTE',
			cliente: `${clienteNombre}\n${cot.cliente?.telefono ?? cot.cliente_telefono ?? ''}\n${cot.cliente?.direccion ?? ''}`,
			table: lineas.map((l) => [
				l.producto_nombre ?? l.descripcion,
				String(l.cantidad),
				`$${l.precio?.toLocaleString('es-AR')}`,
				`$${l.subtotal?.toLocaleString('es-AR')}`
			]),
			totalLabel: 'TOTAL:',
			total: `$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
			footer:
				`Precios expresados en pesos argentinos. Cotización válida hasta el ${vencimiento.toLocaleDateString('es-AR')}.\n` +
				`Condiciones de pago: 50% de anticipo al aprobar, saldo contra entrega.\n` +
				`Gracias por consultar.`
		}
	];

	// generate devuelve Uint8Array, no Buffer
	return await generate({ template, inputs, plugins: { text, table } });
}
