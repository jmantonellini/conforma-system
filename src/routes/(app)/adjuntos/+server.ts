import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '$lib/server/db';
import { adjuntos, cotizaciones, ordenes_fabricacion, pedidos } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';
import { eliminarObjeto, guardarObjeto } from '$lib/server/services/object-storage.service';
import type { TipoEntidadAdjunto } from '$lib/types/adjuntos';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_BATCH_SIZE = 25 * 1024 * 1024;
const TIPOS_ARCHIVO = {
	'image/jpeg': '.webp',
	'image/png': '.webp',
	'image/webp': '.webp',
	'audio/ogg': '.ogg',
	'audio/mpeg': '.mp3',
	'audio/mp4': '.m4a',
	'audio/x-m4a': '.m4a',
	'audio/wav': '.wav',
	'audio/x-wav': '.wav',
	'video/mp4': '.mp4',
	'application/pdf': '.pdf'
};

function permisoEntidad(tipo: TipoEntidadAdjunto) {
	return tipo === 'cotizacion' ? 'cotizaciones' : tipo === 'pedido' ? 'pedidos' : 'taller';
}

async function requirePermiso(tipo: TipoEntidadAdjunto, accion: 'edit' | 'create') {
	try {
		await requirePermission(permisoEntidad(tipo), 'edit');
	} catch (error) {
		if ((tipo !== 'cotizacion' && tipo !== 'pedido') || accion !== 'create') throw error;
		await requirePermission(tipo, 'create');
	}
}

async function entidadExiste(tipo: TipoEntidadAdjunto, id: number) {
	const tabla =
		tipo === 'cotizacion' ? cotizaciones : tipo === 'pedido' ? pedidos : ordenes_fabricacion;
	return db.select({ id: tabla.id }).from(tabla).where(eq(tabla.id, id)).limit(1);
}

export async function POST({ request }) {
	const formData = await request.formData();
	const tipo = formData.get('tipo');
	const entidadId = Number(formData.get('entidad_id'));
	if (tipo !== 'cotizacion' && tipo !== 'pedido' && tipo !== 'fabricacion') {
		return json({ error: 'Tipo de entidad no válido' }, { status: 400 });
	}
	if (!Number.isSafeInteger(entidadId) || entidadId < 1) {
		return json({ error: 'Entidad no encontrada' }, { status: 404 });
	}
	await requirePermiso(tipo, 'create');
	if (!(await entidadExiste(tipo, entidadId)).length) {
		return json({ error: 'Entidad no encontrada' }, { status: 404 });
	}

	const archivos = formData
		.getAll('archivos')
		.filter((archivo): archivo is File => archivo instanceof File && archivo.size > 0);
	const esPlano = tipo === 'fabricacion' && formData.get('es_plano') === 'true';
	if (!archivos.length) return json({ error: 'No se enviaron archivos' }, { status: 400 });
	if (archivos.reduce((total, archivo) => total + archivo.size, 0) > MAX_BATCH_SIZE) {
		return json({ error: 'El total de archivos no puede superar 25 MB' }, { status: 413 });
	}

	const resultados = [];
	for (const archivo of archivos) {
		const extension = TIPOS_ARCHIVO[archivo.type as keyof typeof TIPOS_ARCHIVO];
		if (!extension) {
			resultados.push({ nombre: archivo.name, error: `Tipo no permitido: ${archivo.type}` });
			continue;
		}
		if (archivo.size > MAX_FILE_SIZE) {
			resultados.push({ nombre: archivo.name, error: 'Archivo muy grande (máx. 25 MB)' });
			continue;
		}
		if (esPlano && !archivo.type.startsWith('image/')) {
			resultados.push({
				nombre: archivo.name,
				error: 'Los planos deben ser imágenes JPEG, PNG o WebP'
			});
			continue;
		}

		const esImagen = archivo.type.startsWith('image/');
		const mimeType = esImagen ? 'image/webp' : archivo.type;
		const archivoKey = `${tipo}/${entidadId}-${randomUUID()}${extension}`;
		try {
			const original = Buffer.from(await archivo.arrayBuffer());
			const contenido = esImagen
				? await sharp(original)
						.rotate()
						.resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
						.webp({ quality: 88 })
						.toBuffer()
				: original;
			await guardarObjeto(archivoKey, contenido, mimeType);

			const propietario = {
				cotizacion_id: null as number | null,
				pedido_id: null as number | null,
				orden_fabricacion_id: null as number | null
			};
			if (tipo === 'cotizacion') propietario.cotizacion_id = entidadId;
			else if (tipo === 'pedido') propietario.pedido_id = entidadId;
			else propietario.orden_fabricacion_id = entidadId;

			const [adjunto] = await db
				.insert(adjuntos)
				.values({
					...propietario,
					nombre_original: archivo.name,
					archivo_key: archivoKey,
					mime_type: mimeType,
					es_plano: esPlano,
					tamano_bytes: contenido.length
				})
				.returning({ id: adjuntos.id });
			resultados.push({ nombre: archivo.name, id: adjunto.id });
		} catch (error) {
			await eliminarObjeto(archivoKey).catch(() => {});
			console.error('Error al guardar un archivo adjunto:', error);
			resultados.push({ nombre: archivo.name, error: 'No se pudo guardar el archivo' });
		}
	}

	return json({ success: true, resultados });
}
