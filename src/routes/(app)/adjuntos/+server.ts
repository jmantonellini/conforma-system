import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '$lib/server/db';
import {
	adjuntos,
	cotizaciones,
	ordenes_fabricacion,
	pedidos,
	productos
} from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';
import { eliminarObjeto, guardarObjeto } from '$lib/server/almacenamiento';
import {
	ACCION_ADJUNTO,
	ENTIDAD_ADJUNTO,
	type TipoEntidadAdjunto
} from '$lib/modulos/adjuntos/tipos';
import { ENTIDADES_ADJUNTO } from '$lib/modulos/adjuntos/adjuntos.server';

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

async function requirePermiso(
	tipo: TipoEntidadAdjunto,
	accion: (typeof ACCION_ADJUNTO)[keyof typeof ACCION_ADJUNTO]
) {
	if (tipo === ENTIDAD_ADJUNTO.PRODUCTO) {
		await requirePermission(ENTIDADES_ADJUNTO.producto.modulo, accion);
		return;
	}
	try {
		await requirePermission(ENTIDADES_ADJUNTO[tipo].modulo, ACCION_ADJUNTO.EDITAR);
	} catch (error) {
		const permiteCrear = tipo === ENTIDAD_ADJUNTO.COTIZACION || tipo === ENTIDAD_ADJUNTO.PEDIDO;
		if (!permiteCrear || accion !== ACCION_ADJUNTO.CREAR) throw error;
		await requirePermission(tipo, ACCION_ADJUNTO.CREAR);
	}
}

async function entidadExiste(tipo: TipoEntidadAdjunto, id: number) {
	const tablas = {
		[ENTIDAD_ADJUNTO.COTIZACION]: cotizaciones,
		[ENTIDAD_ADJUNTO.PEDIDO]: pedidos,
		[ENTIDAD_ADJUNTO.PRODUCTO]: productos,
		[ENTIDAD_ADJUNTO.FABRICACION]: ordenes_fabricacion
	};
	const tabla = tablas[tipo];
	return db.select({ id: tabla.id }).from(tabla).where(eq(tabla.id, id)).limit(1);
}

export async function POST({ request }) {
	const formData = await request.formData();
	const tipoValor = formData.get('tipo');
	const entidadId = Number(formData.get('entidad_id'));
	if (
		typeof tipoValor !== 'string' ||
		!Object.values(ENTIDAD_ADJUNTO).includes(tipoValor as TipoEntidadAdjunto)
	) {
		return json({ error: 'Tipo de entidad no válido' }, { status: 400 });
	}
	if (!Number.isSafeInteger(entidadId) || entidadId < 1) {
		return json({ error: 'Entidad no encontrada' }, { status: 404 });
	}
	const tipo = tipoValor as TipoEntidadAdjunto;
	const accion =
		formData.get('accion') === ACCION_ADJUNTO.EDITAR ? ACCION_ADJUNTO.EDITAR : ACCION_ADJUNTO.CREAR;
	await requirePermiso(tipo, accion);
	if (!(await entidadExiste(tipo, entidadId)).length) {
		return json({ error: 'Entidad no encontrada' }, { status: 404 });
	}

	const archivos = formData
		.getAll('archivos')
		.filter((archivo): archivo is File => archivo instanceof File && archivo.size > 0);
	const categoriaPedida = formData.get('categoria');
	const categoria =
		tipo === ENTIDAD_ADJUNTO.PRODUCTO &&
		(categoriaPedida === 'plano' || categoriaPedida === 'portada')
			? categoriaPedida
			: 'general';
	if (categoria === 'portada' && archivos.length !== 1) {
		return json({ error: 'La portada es una sola imagen' }, { status: 400 });
	}
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
		if (categoria !== 'general' && !archivo.type.startsWith('image/')) {
			resultados.push({
				nombre: archivo.name,
				error: 'Planos y portada deben ser imágenes JPEG, PNG o WebP'
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

			const anteriores =
				categoria === 'portada'
					? await db
							.delete(adjuntos)
							.where(and(eq(adjuntos.producto_id, entidadId), eq(adjuntos.categoria, 'portada')))
							.returning({ archivo_key: adjuntos.archivo_key })
					: [];
			await Promise.all(anteriores.map((a) => eliminarObjeto(a.archivo_key).catch(() => {})));

			const [adjunto] = await db
				.insert(adjuntos)
				.values({
					[ENTIDADES_ADJUNTO[tipo].columna.name]: entidadId,
					nombre_original: archivo.name,
					archivo_key: archivoKey,
					mime_type: mimeType,
					categoria,
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
