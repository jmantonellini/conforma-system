import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';

const provider = env.FILE_STORAGE_PROVIDER || 'local';
const localStorageDir = path.resolve(env.FILE_UPLOAD_DIR || 'uploads/adjuntos');
let spacesClient: S3Client | undefined;

function validarClaveObjeto(key: string) {
	if (
		!key ||
		key.startsWith('/') ||
		key.split('/').some((part) => !part || part === '.' || part === '..')
	) {
		throw new Error('Clave de archivo no válida');
	}
}

function clienteSpaces() {
	if (provider !== 'spaces') throw new Error(`Proveedor de archivos no soportado: ${provider}`);
	if (spacesClient) return spacesClient;

	const region = env.SPACES_REGION;
	const accessKeyId = env.SPACES_KEY || env.BUCKET_KEY_ID;
	const secretAccessKey = env.SPACES_SECRET || env.BUCKET_KEY;
	if (!region || !env.SPACES_BUCKET || !accessKeyId || !secretAccessKey) {
		throw new Error('Falta configurar el acceso privado a DigitalOcean Spaces');
	}

	spacesClient = new S3Client({
		endpoint: `https://${region}.digitaloceanspaces.com`,
		region,
		forcePathStyle: false,
		credentials: {
			accessKeyId,
			secretAccessKey
		}
	});
	return spacesClient;
}

function objetoNoEncontrado(error: unknown) {
	if (!(error instanceof Error)) return false;
	const statusCode = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata
		?.httpStatusCode;
	return statusCode === 404 || ['NoSuchKey', 'NotFound', 'NoSuchObject'].includes(error.name);
}

function rutaLocalObjeto(key: string) {
	const filePath = path.resolve(localStorageDir, key);
	if (!filePath.startsWith(`${localStorageDir}${path.sep}`)) {
		throw new Error('Clave de archivo no válida');
	}
	return filePath;
}

function rutaLocalAnterior(key: string) {
	const [tipo, ...resto] = key.split('/');
	const nombre = path.basename(resto.join('/'));
	const directorio =
		tipo === 'cotizaciones'
			? env.UPLOAD_DIR || 'static/uploads/cotizaciones'
			: tipo === 'pedidos'
				? env.PEDIDO_UPLOAD_DIR || 'uploads/pedidos'
				: tipo === 'fabricacion'
					? env.FABRICACION_UPLOAD_DIR || 'uploads/fabricacion'
					: null;
	return directorio ? path.resolve(directorio, nombre) : null;
}

async function leerLocal(key: string) {
	try {
		return await readFile(rutaLocalObjeto(key));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}

	const legacyPath = rutaLocalAnterior(key);
	if (!legacyPath) throw new Error('Archivo no encontrado');
	return readFile(legacyPath);
}

async function borrarLocal(key: string) {
	const rutas = new Set([rutaLocalObjeto(key), rutaLocalAnterior(key)].filter(Boolean) as string[]);
	for (const filePath of rutas) {
		try {
			await unlink(filePath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
	}
}

export async function guardarObjeto(key: string, contenido: Buffer, mimeType: string) {
	validarClaveObjeto(key);
	if (provider === 'spaces') {
		await clienteSpaces().send(
			new PutObjectCommand({
				Bucket: env.SPACES_BUCKET,
				Key: key,
				Body: contenido,
				ContentType: mimeType
			})
		);
		return;
	}
	if (provider !== 'local') throw new Error(`Proveedor de archivos no soportado: ${provider}`);
	const filePath = rutaLocalObjeto(key);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contenido, { flag: 'wx' });
}

export async function leerObjeto(key: string) {
	validarClaveObjeto(key);
	if (provider === 'spaces') {
		try {
			const response = await clienteSpaces().send(
				new GetObjectCommand({ Bucket: env.SPACES_BUCKET, Key: key })
			);
			if (!response.Body) throw new Error('El archivo almacenado no tiene contenido');
			return Buffer.from(await response.Body.transformToByteArray());
		} catch (error) {
			if (!objetoNoEncontrado(error)) throw error;
		}
	}
	if (provider !== 'local' && provider !== 'spaces') {
		throw new Error(`Proveedor de archivos no soportado: ${provider}`);
	}
	return leerLocal(key);
}

export async function eliminarObjeto(key: string) {
	validarClaveObjeto(key);
	if (provider === 'spaces') {
		await clienteSpaces().send(new DeleteObjectCommand({ Bucket: env.SPACES_BUCKET, Key: key }));
	} else if (provider !== 'local') {
		throw new Error(`Proveedor de archivos no soportado: ${provider}`);
	}
	await borrarLocal(key);
}
