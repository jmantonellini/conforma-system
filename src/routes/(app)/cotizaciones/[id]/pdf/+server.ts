import { generarPDFCotizacion } from '$lib/server/pdf/cotizacion';
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
	try {
		const { pdf, clienteNombre, fechaCotizacion } = await generarPDFCotizacion(Number(params.id));
		const clienteArchivo =
			clienteNombre
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '') || 'cliente';
		const fechaArchivo = fechaCotizacion.toISOString().slice(0, 10);
		const nombreArchivo = `cotizacion-${clienteArchivo}-${fechaArchivo}.pdf`;

		// pdf es Uint8Array, y Response acepta directamente ArrayBufferView
		return new Response(pdf.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${nombreArchivo}"`
			}
		});
	} catch (e) {
		console.error(e);
		throw error(404, 'No se pudo generar el PDF');
	}
}
