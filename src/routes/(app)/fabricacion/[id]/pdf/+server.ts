import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adjuntos } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';
import { generarPDFFabricacion } from '$lib/server/pdf/fabricacion';
import { getOrdenFabricacion } from '$lib/remote/fabricacion-consultas.remote';

export async function GET({ params }) {
	await requirePermission('taller', 'view');
	const ordenId = Number(params.id);
	if (!Number.isSafeInteger(ordenId) || ordenId < 1) error(404, 'Orden no encontrada');

	try {
		const orden = await getOrdenFabricacion(ordenId);
		const planos = await db
			.select({
				id: adjuntos.id,
				archivo_key: adjuntos.archivo_key,
				nombre_original: adjuntos.nombre_original,
				mime_type: adjuntos.mime_type
			})
			.from(adjuntos)
			.where(and(eq(adjuntos.orden_fabricacion_id, ordenId), eq(adjuntos.es_plano, true)))
			.orderBy(adjuntos.id);

		const pdf = await generarPDFFabricacion(orden, planos);
		return new Response(pdf, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="orden-fabricacion-${ordenId}.pdf"`,
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (cause) {
		console.error('Error al generar PDF de Orden de Fabricación:', cause);
		throw error(500, 'No se pudo generar el PDF de fabricación');
	}
}
