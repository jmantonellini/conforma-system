import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/auth/permissions';
import { generarPDFFabricacion } from '$lib/modulos/fabricacion/pdf.server';

export async function GET({ params }) {
	await requirePermission('fabricacion', 'view');
	const ordenId = Number(params.id);
	if (!Number.isSafeInteger(ordenId) || ordenId < 1) error(404, 'Orden no encontrada');

	try {
		const pdf = await generarPDFFabricacion(ordenId);
		return new Response(pdf.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="orden-fabricacion-${ordenId}.pdf"`,
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (cause) {
		console.error('Error al generar PDF de Orden de Fabricación:', cause);
		error(500, 'No se pudo generar el PDF de fabricación');
	}
}
