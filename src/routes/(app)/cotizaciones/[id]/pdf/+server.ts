import { generarPDFCotizacion } from '$lib/server/pdf/cotizacion';
import { CotizacionBNAError } from '$lib/server/services/tipo-cambio-bna.service';
import { error } from '@sveltejs/kit';

export async function GET({ params, url }) {
	const monedaParam = url.searchParams.get('moneda');
	if (monedaParam && monedaParam !== 'USD' && monedaParam !== 'ARS') {
		throw error(400, 'La moneda debe ser USD o ARS');
	}
	const moneda = monedaParam === 'ARS' ? 'ARS' : 'USD';

	try {
		const { pdf, clienteNombre, fechaCotizacion } = await generarPDFCotizacion(
			Number(params.id),
			moneda
		);
		const clienteArchivo =
			clienteNombre
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '') || 'cliente';
		const fechaArchivo = fechaCotizacion.toISOString().slice(0, 10);
		const nombreArchivo = `cotizacion-${clienteArchivo}-${fechaArchivo}-${moneda.toLowerCase()}.pdf`;

		// pdf es Uint8Array, y Response acepta directamente ArrayBufferView
		return new Response(pdf.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${nombreArchivo}"`
			}
		});
	} catch (e) {
		console.error(e);
		if (e instanceof CotizacionBNAError) throw error(503, e.message);
		throw error(404, 'No se pudo generar el PDF');
	}
}
