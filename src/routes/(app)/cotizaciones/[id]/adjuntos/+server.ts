import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { adjuntos_cotizacion } from '$lib/server/db/schema';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import sharp from 'sharp';

// Configuración
const UPLOAD_DIR = env.UPLOAD_DIR || 'static/uploads/cotizaciones';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Tipos permitidos
const ALLOWED_TYPES = {
	'image/jpeg': { ext: '.jpg', compress: true },
	'image/png': { ext: '.png', compress: true },
	'image/webp': { ext: '.webp', compress: true },
	'audio/ogg': { ext: '.ogg', compress: false }, // Audio se guarda original por ahora
	'audio/mpeg': { ext: '.mp3', compress: false },
	'audio/mp4': { ext: '.m4a', compress: false },
	'audio/x-m4a': { ext: '.m4a', compress: false },
	'audio/wav': { ext: '.wav', compress: false },
	'audio/x-wav': { ext: '.wav', compress: false },
	'video/mp4': { ext: '.mp4', compress: false },
	'application/pdf': { ext: '.pdf', compress: false }
};

async function comprimirImagen(buffer: Buffer): Promise<Buffer> {
	try {
		let pipeline = sharp(buffer);
		const metadata = await pipeline.metadata();

		// Redimensionar si es muy grande (máx 1600px de ancho)
		if (metadata.width && metadata.width > 1600) {
			pipeline = pipeline.resize(1600, null, {
				withoutEnlargement: true,
				fit: 'inside'
			});
		}

		// Convertir a WebP calidad 80
		return Buffer.from(await pipeline.webp({ quality: 80, effort: 4 }).toBuffer());
	} catch (error) {
		console.error('Error al comprimir imagen:', error);
		return Buffer.from(buffer); // Devolver original si falla
	}
}

export async function POST({ request, params }) {
	try {
		const formData = await request.formData();
		const files = formData
			.getAll('archivos')
			.filter((f): f is File => f instanceof File && f.size > 0);

		if (!files.length) {
			return json({ error: 'No se enviaron archivos' }, { status: 400 });
		}

		await mkdir(UPLOAD_DIR, { recursive: true });

		const resultados = [];

		for (const file of files) {
			const fileType = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];
			if (!fileType) {
				resultados.push({ nombre: file.name, error: `Tipo no permitido: ${file.type}` });
				continue;
			}

			if (file.size > MAX_FILE_SIZE) {
				resultados.push({ nombre: file.name, error: 'Archivo muy grande (máx 25MB)' });
				continue;
			}

			// Procesar archivo
			const buffer = Buffer.from(await file.arrayBuffer());
			let finalBuffer = buffer;
			let finalExt = fileType.ext;
			let finalMimeType = file.type;
			let comprimido = false;

			// Solo comprimir imágenes
			if (fileType.compress && file.type.startsWith('image/')) {
				finalBuffer = await comprimirImagen(buffer);
				finalExt = '.webp';
				finalMimeType = 'image/webp';
				comprimido = true;
			}

			// Generar nombre único con la extensión final
			const timestamp = Date.now();
			const random = Math.random().toString(36).substring(7);
			const filename = `${params.id}-${timestamp}-${random}${finalExt}`;
			const filepath = path.join(UPLOAD_DIR, filename);

			await writeFile(filepath, finalBuffer);

			// Guardar en DB con los datos finales (post-compresión)
			const [adjunto] = await db
				.insert(adjuntos_cotizacion)
				.values({
					cotizacion_id: Number(params.id),
					nombre_original: file.name,
					archivo_url: `/uploads/cotizaciones/${filename}`,
					mime_type: finalMimeType, // Usar el MIME final (image/webp si se comprimió)
					tamano_bytes: finalBuffer.length // Usar tamaño final, no el original
				})
				.returning();

			resultados.push({
				nombre: file.name,
				adjunto,
				comprimido,
				tamano_original: file.size,
				tamano_final: finalBuffer.length
			});
		}

		return json({ success: true, resultados });
	} catch (error) {
		console.error('Error al subir archivos:', error);
		return json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}
