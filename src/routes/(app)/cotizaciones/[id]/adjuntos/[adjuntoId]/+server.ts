import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { adjuntos_cotizacion } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';

const UPLOAD_DIR = env.UPLOAD_DIR || 'static/uploads/cotizaciones';

export async function GET({ params }) {
	await requirePermission('cotizaciones', 'view');

	const cotizacionId = Number(params.id);
	const adjuntoId = Number(params.adjuntoId);
	if (!Number.isInteger(cotizacionId) || !Number.isInteger(adjuntoId)) {
		error(404, 'Adjunto no encontrado');
	}

	const [adjunto] = await db
		.select()
		.from(adjuntos_cotizacion)
		.where(
			and(
				eq(adjuntos_cotizacion.id, adjuntoId),
				eq(adjuntos_cotizacion.cotizacion_id, cotizacionId)
			)
		)
		.limit(1);
	if (!adjunto) error(404, 'Adjunto no encontrado');

	const uploadDir = path.resolve(UPLOAD_DIR);
	const filePath = path.resolve(uploadDir, path.basename(adjunto.archivo_url));
	if (!filePath.startsWith(`${uploadDir}${path.sep}`)) error(404, 'Adjunto no encontrado');

	let contenido: Buffer;
	try {
		contenido = await readFile(filePath);
	} catch {
		error(404, 'Adjunto no encontrado');
	}

	return new Response(new Uint8Array(contenido), {
		headers: {
			'Content-Type': adjunto.mime_type || 'application/octet-stream',
			'Content-Disposition': 'inline',
			'Cache-Control': 'private, max-age=3600',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}
