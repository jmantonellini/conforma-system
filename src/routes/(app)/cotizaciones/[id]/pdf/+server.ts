import { generarPDFCotizacion } from '$lib/server/pdf/cotizacion';
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
	try {
		const pdf = await generarPDFCotizacion(Number(params.id));

		// pdf es Uint8Array, y Response acepta directamente ArrayBufferView
		return new Response(pdf, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="cotizacion-${params.id}.pdf"`
			}
		});
	} catch (e) {
		console.error(e);
		throw error(404, 'No se pudo generar el PDF');
	}
}
