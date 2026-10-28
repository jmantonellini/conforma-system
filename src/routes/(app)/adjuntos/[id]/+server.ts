import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adjuntos } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';
import { eliminarObjeto, leerObjeto } from '$lib/server/services/object-storage.service';
import type { TipoEntidadAdjunto } from '$lib/types/adjuntos';

function propietario(adjunto: typeof adjuntos.$inferSelect) {
	if (adjunto.cotizacion_id) {
		return { tipo: 'cotizacion' as const, id: adjunto.cotizacion_id };
	}
	if (adjunto.pedido_id) return { tipo: 'pedido' as const, id: adjunto.pedido_id };
	if (adjunto.orden_fabricacion_id) {
		return { tipo: 'fabricacion' as const, id: adjunto.orden_fabricacion_id };
	}
	if (adjunto.producto_id) return { tipo: 'producto' as const, id: adjunto.producto_id };
	return null;
}

function permisoEntidad(tipo: TipoEntidadAdjunto) {
	if (tipo === 'cotizacion') return 'cotizaciones';
	if (tipo === 'pedido') return 'pedidos';
	if (tipo === 'producto') return 'productos';
	return 'taller';
}

async function obtenerAdjunto(id: number) {
	const [adjunto] = await db.select().from(adjuntos).where(eq(adjuntos.id, id)).limit(1);
	if (!adjunto) error(404, 'Archivo no encontrado');
	const owner = propietario(adjunto);
	if (!owner) error(404, 'Archivo no encontrado');
	return { adjunto, owner };
}

export async function GET({ params }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Archivo no encontrado');
	const { adjunto, owner } = await obtenerAdjunto(id);
	try {
		await requirePermission(permisoEntidad(owner.tipo), 'view');
	} catch (cause) {
		if (owner.tipo !== 'producto' || !adjunto.es_plano) throw cause;
		await requirePermission('taller', 'view');
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
	await requirePermission(permisoEntidad(owner.tipo), 'edit');

	await eliminarObjeto(adjunto.archivo_key);
	await db.delete(adjuntos).where(eq(adjuntos.id, id));
	return new Response(null, { status: 204 });
}
