import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export type ImagenPdf = { datos: string; ancho: number; alto: number };

const LADO_MAXIMO = 2200;
const MAXIMO_EN_CACHE = 60;
const cache = new Map<string, Promise<ImagenPdf>>();

function recordar(clave: string, crear: () => Promise<ImagenPdf>) {
	const existente = cache.get(clave);
	if (existente) return existente;
	const promesa = crear().catch((error) => {
		cache.delete(clave);
		throw error;
	});
	cache.set(clave, promesa);
	if (cache.size > MAXIMO_EN_CACHE) cache.delete(cache.keys().next().value!);
	return promesa;
}

export async function prepararImagen(
	contenido: Buffer,
	{ vertical = false }: { vertical?: boolean } = {}
): Promise<ImagenPdf> {
	const orientada = await sharp(contenido, { failOn: 'none' }).rotate().toBuffer();
	const { width = 1, height = 1 } = await sharp(orientada).metadata();
	const girar = vertical && width > height * 1.15;
	const imagen = sharp(orientada).rotate(girar ? 90 : 0);
	const reducir = Math.max(width, height) > LADO_MAXIMO;
	const salida = await (
		reducir ? imagen.resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside' }) : imagen
	)
		.flatten({ background: '#ffffff' })
		.jpeg({ quality: 85, mozjpeg: true })
		.toBuffer({ resolveWithObject: true });
	return {
		datos: `data:image/jpeg;base64,${salida.data.toString('base64')}`,
		ancho: salida.info.width,
		alto: salida.info.height
	};
}

export const imagenEnCache = (
	clave: string,
	leer: () => Promise<Buffer>,
	opciones: { vertical?: boolean } = {}
) =>
	recordar(`${clave}:${opciones.vertical ? 'v' : 'o'}`, async () =>
		prepararImagen(await leer(), opciones)
	);

export function logoEmpresa(logoUrl: string | null | undefined, logoPorDefecto: string) {
	return recordar(`logo:${logoUrl ?? ''}`, async () => {
		const ruta = logoPorDefecto.replace(/^\//, '');
		const candidatos = [
			logoUrl ? path.resolve('static', logoUrl.replace(/^\//, '')) : '',
			path.resolve('src/lib/assets/Logo.png'),
			path.resolve('.svelte-kit/output/client', ruta),
			path.resolve('build/client', ruta)
		].filter(Boolean);
		for (const candidato of candidatos) {
			const contenido = await readFile(candidato).catch(() => null);
			if (!contenido) continue;
			const { width = 1, height = 1 } = await sharp(contenido).metadata();
			return {
				datos: `data:image/png;base64,${contenido.toString('base64')}`,
				ancho: width,
				alto: height
			};
		}
		throw new Error('No se encontró el logo de la empresa');
	});
}
