import 'dotenv/config';
import pg from 'pg';
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: opciones, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		confirmar: { type: 'boolean', default: false },
		deshacer: { type: 'boolean', default: false },
		reubicar: { type: 'boolean', default: false },
		portadas: { type: 'boolean', default: true },
		paralelo: { type: 'string', default: '8' }
	}
});

const [carpeta] = positionals;
if (!carpeta && !opciones.deshacer) {
	console.error(
		'Uso: node scripts/historico/medios.mjs <carpeta con manifiesto.tsv> [--confirmar] | --deshacer [--confirmar]'
	);
	process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const MARCA = '-hist-';
const MIME = { '.webp': 'image/webp', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };
const proveedor = process.env.FILE_STORAGE_PROVIDER || 'local';
const directorioLocal = path.resolve(process.env.FILE_UPLOAD_DIR || 'uploads/adjuntos');

function clienteSpaces() {
	const region = process.env.SPACES_REGION;
	const accessKeyId = process.env.SPACES_KEY || process.env.BUCKET_KEY_ID;
	const secretAccessKey = process.env.SPACES_SECRET || process.env.BUCKET_KEY;
	if (!region || !process.env.SPACES_BUCKET || !accessKeyId || !secretAccessKey) {
		throw new Error('Falta configurar el acceso a DigitalOcean Spaces');
	}
	return new S3Client({
		endpoint: `https://${region}.digitaloceanspaces.com`,
		region,
		forcePathStyle: false,
		credentials: { accessKeyId, secretAccessKey }
	});
}

const s3 = proveedor === 'spaces' ? clienteSpaces() : null;

async function guardar(clave, contenido, mime) {
	if (s3) {
		await s3.send(
			new PutObjectCommand({
				Bucket: process.env.SPACES_BUCKET,
				Key: clave,
				Body: contenido,
				ContentType: mime
			})
		);
		return;
	}
	const ruta = path.join(directorioLocal, clave);
	await mkdir(path.dirname(ruta), { recursive: true });
	await writeFile(ruta, contenido);
}

async function copiar(origen, destino) {
	if (s3) {
		await s3.send(
			new CopyObjectCommand({
				Bucket: process.env.SPACES_BUCKET,
				CopySource: `${process.env.SPACES_BUCKET}/${origen}`,
				Key: destino
			})
		);
		return;
	}
	await mkdir(path.dirname(path.join(directorioLocal, destino)), { recursive: true });
	await copyFile(path.join(directorioLocal, origen), path.join(directorioLocal, destino));
}

async function borrar(clave) {
	if (s3) {
		await s3.send(new DeleteObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: clave }));
		return;
	}
	await unlink(path.join(directorioLocal, clave)).catch(() => {});
}

async function enParalelo(tareas, cantidad) {
	let siguiente = 0;
	const trabajadores = Array.from({ length: cantidad }, async () => {
		while (siguiente < tareas.length) await tareas[siguiente++]();
	});
	await Promise.all(trabajadores);
}

function leerManifiesto(texto) {
	const [encabezado, ...lineas] = texto.split(/\r?\n/).filter(Boolean);
	const columnas = encabezado.split('\t');
	return lineas.map((linea) => {
		const valores = linea.split('\t');
		return Object.fromEntries(columnas.map((columna, i) => [columna, valores[i] ?? '']));
	});
}

const huella = (texto) => createHash('sha1').update(texto).digest('hex').slice(0, 16);
const nombreVisible = (ruta, extension) => path.basename(ruta).replace(/\.[^.]+$/, '') + extension;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const consulta = async (sql, parametros = []) => (await pool.query(sql, parametros)).rows;

const COLUMNA = {
	fabricacion: 'orden_fabricacion_id',
	pedido: 'pedido_id',
	producto: 'producto_id',
	unidad: 'unidad_fabricacion_id'
};

const numerosDe = (fila) =>
	fila.escapes
		.split(',')
		.map((n) => Number(n.trim()))
		.filter(Number.isSafeInteger);

async function unidadesPorNumero(filas) {
	const unidades = await consulta(
		`SELECT id, numero, producto_id, orden_fabricacion_id, pedido_id FROM unidades_fabricacion
		WHERE numero = ANY($1::int[]) ORDER BY numero, id`,
		[[...new Set(filas.flatMap(numerosDe))]]
	);
	const porNumero = new Map();
	for (const unidad of unidades)
		if (!porNumero.has(unidad.numero)) porNumero.set(unidad.numero, unidad);
	return porNumero;
}

function destinosDe(fila, porNumero) {
	const destinos = new Set();
	for (const numero of numerosDe(fila)) {
		const unidad = porNumero.get(numero);
		if (unidad?.orden_fabricacion_id) destinos.add(`fabricacion/${unidad.orden_fabricacion_id}`);
		else if (unidad?.pedido_id) destinos.add(`pedido/${unidad.pedido_id}`);
		else if (unidad) destinos.add(`unidad/${unidad.id}`);
	}
	return [...destinos];
}

const categoriaDe = (fila, tipo) =>
	fila.tipo === 'plano' && tipo === 'producto' ? 'plano' : 'general';

async function reubicar() {
	const filas = leerManifiesto(await readFile(path.join(carpeta, 'manifiesto.tsv'), 'utf8'));
	const porNumero = await unidadesPorNumero(filas);
	const actuales = await consulta(
		`SELECT id, archivo_key, orden_fabricacion_id, pedido_id, producto_id, unidad_fabricacion_id FROM adjuntos
		WHERE archivo_key LIKE $1 AND categoria <> 'portada'`,
		[`%${MARCA}%`]
	);
	const porBase = new Map();
	for (const fila of actuales) {
		const base = fila.archivo_key.split(MARCA)[1].replace(/\.[^.]+$/, '');
		const dueno = fila.orden_fabricacion_id
			? `fabricacion/${fila.orden_fabricacion_id}`
			: fila.pedido_id
				? `pedido/${fila.pedido_id}`
				: fila.unidad_fabricacion_id
					? `unidad/${fila.unidad_fabricacion_id}`
					: `producto/${fila.producto_id}`;
		if (!porBase.has(base)) porBase.set(base, []);
		porBase.get(base).push({ ...fila, dueno });
	}

	const resumen = { movidos: 0, copiados: 0, borrados: 0, sinCambios: 0 };
	const porDestino = {};
	const tareas = [];
	for (const fila of filas) {
		const base = huella(fila.ruta_original);
		const extension = path.extname(fila.archivo).toLowerCase();
		const filasActuales = porBase.get(base) ?? [];
		if (!filasActuales.length) continue;
		const pendientes = new Set(destinosDe(fila, porNumero));
		const sobrantes = [];
		for (const actual of filasActuales) {
			if (pendientes.delete(actual.dueno)) resumen.sinCambios++;
			else sobrantes.push(actual);
		}
		for (const destino of pendientes) {
			const [tipo, id] = destino.split('/');
			porDestino[tipo] = (porDestino[tipo] ?? 0) + 1;
			const categoria = categoriaDe(fila, tipo);
			const sobrante = sobrantes.shift();
			if (sobrante) {
				resumen.movidos++;
				tareas.push(() =>
					consulta(
						`UPDATE adjuntos SET ${Object.values(COLUMNA)
							.map((columna) => `${columna} = ${columna === COLUMNA[tipo] ? '$2' : 'NULL'}`)
							.join(', ')}, categoria = $3 WHERE id = $1`,
						[sobrante.id, Number(id), categoria]
					)
				);
				continue;
			}
			resumen.copiados++;
			const origen = filasActuales[0].archivo_key;
			const clave = `${tipo}/${id}${MARCA}${base}${extension}`;
			tareas.push(async () => {
				await copiar(origen, clave);
				await consulta(
					`INSERT INTO adjuntos (${COLUMNA[tipo]}, nombre_original, archivo_key, mime_type, categoria,
						tamano_bytes, created_at)
					SELECT $2, nombre_original, $3, mime_type, $4, tamano_bytes, created_at FROM adjuntos WHERE id = $1`,
					[filasActuales[0].id, Number(id), clave, categoria]
				);
			});
		}
		for (const sobrante of sobrantes) {
			resumen.borrados++;
			tareas.push(async () => {
				await consulta('DELETE FROM adjuntos WHERE id = $1', [sobrante.id]);
				await borrar(sobrante.archivo_key).catch(() => {});
			});
		}
	}
	console.table({
		...resumen,
		...Object.fromEntries(Object.entries(porDestino).map(([tipo, n]) => [`hacia ${tipo}`, n]))
	});
	if (!opciones.confirmar) {
		console.log('[medios] Simulación: no se movió nada. Agregá --confirmar para reubicar.');
		return;
	}
	await enParalelo(tareas, Number(opciones.paralelo));
	console.log('[medios] Reubicados.');
}

async function deshacer() {
	const filas = await consulta('SELECT id, archivo_key FROM adjuntos WHERE archivo_key LIKE $1', [
		`%${MARCA}%`
	]);
	console.log(`[medios] Adjuntos históricos: ${filas.length}`);
	if (!opciones.confirmar) {
		console.log('[medios] Simulación: no se borró nada. Agregá --confirmar para borrarlos.');
		return;
	}
	await enParalelo(
		filas.map((fila) => () => borrar(fila.archivo_key).catch(() => {})),
		Number(opciones.paralelo)
	);
	await consulta('DELETE FROM adjuntos WHERE archivo_key LIKE $1', [`%${MARCA}%`]);
	console.log('[medios] Borrados.');
}

async function cargar() {
	const filas = leerManifiesto(await readFile(path.join(carpeta, 'manifiesto.tsv'), 'utf8'));
	const porNumero = await unidadesPorNumero(filas);

	const existentes = new Set(
		(
			await consulta('SELECT archivo_key FROM adjuntos WHERE archivo_key LIKE $1', [`%${MARCA}%`])
		).map((f) => f.archivo_key)
	);
	const conPortada = new Set(
		(
			await consulta(
				"SELECT producto_id FROM adjuntos WHERE categoria = 'portada' AND producto_id IS NOT NULL"
			)
		).map((f) => f.producto_id)
	);

	const resumen = {
		filas: filas.length,
		adjuntos: 0,
		yaCargados: 0,
		portadas: 0,
		sinEscapeEnSistema: 0,
		bytes: 0
	};
	const porTipo = {};
	const destinos = new Set();
	const tareas = [];
	let hechos = 0;
	const ordenadas = [...filas].sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));

	for (const fila of ordenadas) {
		const extension = path.extname(fila.archivo).toLowerCase();
		const mime = MIME[extension];
		if (!mime) throw new Error(`Extensión no soportada: ${fila.archivo}`);
		const objetivos = destinosDe(fila, porNumero);
		const portadas = new Set(
			numerosDe(fila)
				.map((numero) => porNumero.get(numero)?.producto_id)
				.filter(Boolean)
		);
		if (!objetivos.length) {
			resumen.sinEscapeEnSistema++;
			continue;
		}
		const base = huella(fila.ruta_original);
		const creado = fila.fecha ? `${fila.fecha}T12:00:00-03:00` : null;
		const bytes = Number(fila.bytes) || 0;
		const pendientes = objetivos.map((destino) => {
			const [tipo, id] = destino.split('/');
			return {
				tipo,
				entidadId: Number(id),
				categoria: categoriaDe(fila, tipo),
				clave: `${tipo}/${id}${MARCA}${base}${extension}`
			};
		});
		if (opciones.portadas && fila.tipo === 'foto') {
			for (const productoId of portadas) {
				if (conPortada.has(productoId)) continue;
				conPortada.add(productoId);
				pendientes.push({
					tipo: 'producto',
					entidadId: productoId,
					categoria: 'portada',
					clave: `producto/${productoId}${MARCA}portada-${base}${extension}`
				});
			}
		}

		for (const pendiente of pendientes) {
			if (existentes.has(pendiente.clave)) {
				resumen.yaCargados++;
				continue;
			}
			existentes.add(pendiente.clave);
			resumen.adjuntos++;
			if (pendiente.categoria === 'portada') resumen.portadas++;
			resumen.bytes += bytes;
			porTipo[fila.tipo] = (porTipo[fila.tipo] ?? 0) + 1;
			destinos.add(`${pendiente.tipo}/${pendiente.entidadId}`);
			tareas.push(async () => {
				const contenido = await readFile(path.join(carpeta, fila.archivo));
				await guardar(pendiente.clave, contenido, mime);
				await consulta(
					`INSERT INTO adjuntos (${COLUMNA[pendiente.tipo]},
						nombre_original, archivo_key, mime_type, categoria, tamano_bytes, created_at)
					VALUES ($1, $2, $3, $4, $5, $6, coalesce($7::timestamptz, now()))`,
					[
						pendiente.entidadId,
						nombreVisible(fila.ruta_original, extension),
						pendiente.clave,
						mime,
						pendiente.categoria,
						contenido.length,
						creado
					]
				);
				hechos++;
				if (hechos % 250 === 0) console.log(`[medios] ${hechos}/${tareas.length}`);
			});
		}
	}

	console.table({
		...resumen,
		MB: Math.round(resumen.bytes / 1024 / 1024),
		...Object.fromEntries(Object.entries(porTipo).map(([tipo, n]) => [`adjuntos ${tipo}`, n])),
		'productos u OF': destinos.size
	});
	if (!opciones.confirmar) {
		console.log('[medios] Simulación: no se subió nada. Agregá --confirmar para cargar.');
		return;
	}
	await enParalelo(tareas, Number(opciones.paralelo));
	console.log(`[medios] Cargados ${hechos} adjuntos.`);
}

try {
	await (opciones.deshacer ? deshacer() : opciones.reubicar ? reubicar() : cargar());
} catch (error) {
	console.error(`[medios] ${error.message}`);
	process.exitCode = 1;
} finally {
	await pool.end();
}
