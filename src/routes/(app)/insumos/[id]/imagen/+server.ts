import { randomUUID } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { insumos } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';
import { eliminarObjeto, guardarObjeto, leerObjeto } from '$lib/server/almacenamiento';

const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const MIME_IMAGENES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function obtenerInsumo(id: number) {
	const [insumo] = await db
		.select({ id: insumos.id, imagen_key: insumos.imagen_key })
		.from(insumos)
		.where(eq(insumos.id, id))
		.limit(1);
	if (!insumo) error(404, 'Insumo no encontrado');
	return insumo;
}

async function requirePermisoImagen(tieneImagen: boolean) {
	try {
		await requirePermission('insumos', 'edit');
	} catch (cause) {
		if (tieneImagen) throw cause;
		await requirePermission('insumos', 'create');
	}
}

async function requirePermisoLecturaImagen() {
	try {
		await requirePermission('insumos', 'view');
	} catch {
		await requirePermission('insumos', 'edit');
	}
}

export async function GET({ params }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Imagen no encontrada');
	await requirePermisoLecturaImagen();
	const insumo = await obtenerInsumo(id);
	if (!insumo.imagen_key) error(404, 'Imagen no encontrada');

	let contenido: Buffer;
	try {
		contenido = await leerObjeto(insumo.imagen_key);
	} catch {
		error(404, 'Imagen no encontrada');
	}

	return new Response(new Uint8Array(contenido), {
		headers: {
			'Content-Type': 'image/webp',
			'Content-Disposition': 'inline',
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}

export async function POST({ params, request }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Insumo no encontrado');
	const insumo = await obtenerInsumo(id);
	await requirePermisoImagen(Boolean(insumo.imagen_key));

	const archivo = (await request.formData()).get('imagen');
	if (!(archivo instanceof File) || archivo.size === 0) {
		return json({ error: 'Seleccioná una imagen' }, { status: 400 });
	}
	if (!MIME_IMAGENES.has(archivo.type)) {
		return json({ error: 'Usá una imagen JPEG, PNG o WebP' }, { status: 400 });
	}
	if (archivo.size > MAX_IMAGEN_BYTES) {
		return json({ error: 'La imagen no puede superar 5 MB' }, { status: 413 });
	}

	const imagenKey = `insumos/${id}-${randomUUID()}.webp`;
	try {
		const imagen = await sharp(Buffer.from(await archivo.arrayBuffer()))
			.rotate()
			.resize(480, 480, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 82 })
			.toBuffer();
		await guardarObjeto(imagenKey, imagen, 'image/webp');
		await db.update(insumos).set({ imagen_key: imagenKey }).where(eq(insumos.id, id));
	} catch (cause) {
		await eliminarObjeto(imagenKey).catch(() => {});
		console.error('No se pudo guardar la imagen del insumo:', cause);
		return json({ error: 'No se pudo guardar la imagen' }, { status: 500 });
	}

	if (insumo.imagen_key) await eliminarObjeto(insumo.imagen_key).catch(() => {});
	return json({ success: true });
}

export async function DELETE({ params }) {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id < 1) error(404, 'Insumo no encontrado');
	const insumo = await obtenerInsumo(id);
	await requirePermission('insumos', 'edit');
	if (!insumo.imagen_key) return new Response(null, { status: 204 });

	await db.update(insumos).set({ imagen_key: null }).where(eq(insumos.id, id));
	await eliminarObjeto(insumo.imagen_key);
	return new Response(null, { status: 204 });
}
