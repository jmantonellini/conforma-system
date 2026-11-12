import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adjuntos, CATEGORIAS_ADJUNTO } from '$lib/server/db/schema';
import type { CategoriaAdjunto } from '$lib/types/adjuntos';
import { requirePermission } from '$lib/server/auth/permissions';
import { eliminarObjeto, leerObjeto } from '$lib/server/services/object-storage.service';
import { ENTIDADES_ADJUNTO, propietarioAdjunto } from '$lib/server/services/adjuntos.service';

async function obtenerAdjunto(id: number) {
	const [adjunto] = await db.select().from(adjuntos).where(eq(adjuntos.id, id)).limit(1);
	if (!adjunto) error(404, 'Archivo no encontrado');
	const owner = propietarioAdjunto(adjunto);
	if (!owner) error(404, 'Archivo no encontrado');
	return { adjunto, owner };
}

export async function GET({ params }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Archivo no encontrado');
	const { adjunto, owner } = await obtenerAdjunto(id);
	try {
		await requirePermission(ENTIDADES_ADJUNTO[owner.tipo].modulo, 'view');
	} catch (cause) {
		if (owner.tipo !== 'producto' || adjunto.categoria === 'general') throw cause;
		await requirePermission(ENTIDADES_ADJUNTO.fabricacion.modulo, 'view');
	}

	let contenido: Buffer;
	try {
		contenido = await leerObjeto(adjunto.archivo_key);
	} catch {
		error(404, 'Archivo no encontrado');
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

export async function DELETE({ params }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Archivo no encontrado');
	const { adjunto, owner } = await obtenerAdjunto(id);
	await requirePermission(ENTIDADES_ADJUNTO[owner.tipo].modulo, 'edit');

	await eliminarObjeto(adjunto.archivo_key);
	await db.delete(adjuntos).where(eq(adjuntos.id, id));
	return new Response(null, { status: 204 });
}

/** Cambia la categoría de un archivo de producto (general, plano o portada). */
export async function PATCH({ params, request }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Archivo no encontrado');
	const { adjunto, owner } = await obtenerAdjunto(id);
	await requirePermission(ENTIDADES_ADJUNTO[owner.tipo].modulo, 'edit');

	const { categoria } = (await request.json().catch(() => ({}))) as { categoria?: unknown };
	if (!CATEGORIAS_ADJUNTO.includes(categoria as CategoriaAdjunto))
		error(400, 'Categoría no válida');
	if (categoria !== 'general' && owner.tipo !== 'producto') {
		error(400, 'Solo los productos tienen planos y portada');
	}
	if (categoria !== 'general' && !adjunto.mime_type?.startsWith('image/')) {
		error(400, 'Planos y portada deben ser imágenes');
	}

	await db.transaction(async (tx) => {
		// Una sola portada: la anterior vuelve a ser un archivo general.
		if (categoria === 'portada') {
			await tx
				.update(adjuntos)
				.set({ categoria: 'general' })
				.where(and(eq(adjuntos.producto_id, owner.id), eq(adjuntos.categoria, 'portada')));
		}
		await tx
			.update(adjuntos)
			.set({ categoria: categoria as CategoriaAdjunto })
			.where(eq(adjuntos.id, id));
	});
	return new Response(null, { status: 204 });
}
