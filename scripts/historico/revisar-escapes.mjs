import 'dotenv/config';
import pg from 'pg';
import XLSX from 'xlsx';
import { parseArgs } from 'node:util';
import { leerHojas } from './datos.mjs';
import { palabras } from './clientes.mjs';
import { normal } from './productos.mjs';

const { values: opciones, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		informe: { type: 'string' },
		confirmar: { type: 'boolean', default: false },
		dias: { type: 'string', default: '45' }
	}
});

const [archivo] = positionals;
if (!archivo) {
	console.error(
		'Uso: node scripts/historico/revisar-escapes.mjs <historico.xlsx> [--informe revision.xlsx] [--confirmar]'
	);
	process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const DIAS = Number(opciones.dias);
const compacto = (valor) => normal(valor).replace(/[^A-Z0-9]/g, '');
const texto = (valor) => String(valor ?? '').trim();

function distancia(a, b) {
	const previa = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = previa[0];
		previa[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const actual = previa[j];
			previa[j] = Math.min(
				previa[j] + 1,
				previa[j - 1] + 1,
				diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
			diagonal = actual;
		}
	}
	return previa[b.length];
}

const palabraParecida = (a, b) =>
	a === b ||
	(Math.min(a.length, b.length) >= 4 && distancia(a, b) <= 1) ||
	(Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));

function mismoCliente(delEscape, otro) {
	const pa = [...new Set(palabras(delEscape))];
	const pb = [...new Set(palabras(otro))];
	if (!pa.some((p) => p.length >= 4) || !pb.length) return false;
	return pa.every((p) => pb.some((q) => palabraParecida(p, q)));
}

const fechaExcel = (valor) =>
	valor instanceof Date
		? new Date(valor.getTime() - 3 * 36e5).toISOString().slice(0, 10)
		: typeof valor === 'number'
			? new Date(Math.round((valor - 25569) * 864e5)).toISOString().slice(0, 10)
			: texto(valor).slice(0, 10) || null;
const diasEntre = (a, b) => Math.abs((new Date(a) - new Date(b)) / 864e5);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const consulta = async (sql, parametros = []) => (await pool.query(sql, parametros)).rows;

const modelosConocidos = (
	await consulta(`SELECT mo.id, mo.nombre, mo.marca_id, ma.nombre AS marca FROM modelos mo
		JOIN marcas ma ON ma.id = mo.marca_id`)
)
	.map((m) => ({ ...m, clave: compacto(m.nombre), claveMarca: compacto(m.marca) }))
	.filter((m) => m.clave.length >= 3 && !/^\d+$/.test(m.clave));

function fragmentos(valor) {
	const tokens = normal(valor)
		.replace(/[^A-Z0-9]+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean);
	const resultado = new Set();
	for (let i = 0; i < tokens.length; i++) {
		for (let n = 1; n <= 3 && i + n <= tokens.length; n++)
			resultado.add(tokens.slice(i, i + n).join(''));
	}
	return resultado;
}

const productos = new Map(
	(
		await consulta(`SELECT p.id, p.nombre, p.tipo_pieza, p.historico, p.marca_id, p.modelo_id,
			ma.nombre AS marca, mo.nombre AS modelo FROM productos p
			LEFT JOIN marcas ma ON ma.id = p.marca_id LEFT JOIN modelos mo ON mo.id = p.modelo_id`)
	).map((p) => [p.id, { ...p, claveMarca: compacto(p.marca), claveModelo: compacto(p.modelo) }])
);

const unidades =
	await consulta(`SELECT u.id, u.numero, u.orden_fabricacion_id, u.pedido_id, u.producto_id,
	u.contacto_id, u.numero_serie, u.observaciones FROM unidades_fabricacion u WHERE u.numero IS NOT NULL`);

const ordenes = new Map(
	(
		await consulta(`SELECT o.id, o.fecha_inicio::date::text AS fecha, o.fecha_fin_real::date::text AS fin,
			o.cantidad_total, p.id AS pedido_id, p.contacto_id, c.razon_social AS cliente,
			coalesce(array_agg(DISTINCT lp.producto_id) FILTER (WHERE lp.producto_id IS NOT NULL), '{}') AS productos
		FROM ordenes_fabricacion o
		LEFT JOIN lineas_pedido l ON l.id = o.linea_pedido_id
		LEFT JOIN pedidos p ON p.id = l.pedido_id
		LEFT JOIN contactos c ON c.id = p.contacto_id
		LEFT JOIN lineas_pedido lp ON lp.pedido_id = p.id
		GROUP BY o.id, p.id, c.razon_social`)
	).map((o) => [o.id, o])
);

const libres = new Map();
for (const fila of await consulta(`SELECT orden_fabricacion_id AS orden, array_agg(id ORDER BY id) AS ids
	FROM unidades_fabricacion WHERE numero IS NULL AND orden_fabricacion_id IS NOT NULL GROUP BY 1`)) {
	libres.set(fila.orden, fila.ids);
}

const contactos = await consulta('SELECT id, razon_social FROM contactos WHERE es_cliente');

const { 'ESCAPES FABRICADOS': filasEscapes } = leerHojas(archivo, ['ESCAPES FABRICADOS']);
const filaPorNumero = new Map(filasEscapes.map((f) => [Number(f['N° ESCAPE']), f]));

function vehiculo(fila) {
	const original = texto(fila['MODELO ORIGINAL']);
	const libre = `${original} ${texto(fila.OBSERVACIONES)}`;
	let marca = normal(fila.MARCA);
	let modelo = normal(fila.MODELO);
	const enTexto = fragmentos(libre);
	const mencionados = modelosConocidos.filter((m) => enTexto.has(m.clave));
	const marcaEnTexto = marca && enTexto.has(compacto(marca));
	const otraMarca = mencionados.find((m) => m.claveMarca !== compacto(marca));
	let corregido = null;
	if (otraMarca && !marcaEnTexto && /\d/.test(otraMarca.clave)) {
		corregido = `${marca || '?'} ${modelo || ''} → ${otraMarca.marca} ${otraMarca.nombre}`.trim();
		marca = normal(otraMarca.marca);
		modelo = normal(otraMarca.nombre);
	} else if (!modelo && marca) {
		const propio = mencionados.find((m) => m.claveMarca === compacto(marca));
		const resto = normal(original)
			.replace(new RegExp(`\\b${marca}\\b`), '')
			.trim();
		modelo = propio ? normal(propio.nombre) : resto;
		if (modelo) corregido = `${marca} (sin modelo) → ${marca} ${modelo}`;
	}
	return {
		marca,
		modelo,
		claveMarca: compacto(marca),
		claveModelo: compacto(modelo),
		original,
		corregido,
		conocido:
			modelosConocidos.find(
				(m) => m.claveMarca === compacto(marca) && m.clave === compacto(modelo)
			) ?? null
	};
}

function encaja(v, producto) {
	if (!producto) return null;
	const mismaMarca =
		producto.claveMarca && v.claveMarca ? producto.claveMarca === v.claveMarca : null;
	if (producto.claveModelo && v.claveModelo) {
		const a = producto.claveModelo;
		const b = v.claveModelo;
		if (a === b || (a.length >= 3 && b.includes(a)) || (b.length >= 3 && a.includes(b))) {
			return mismaMarca === false ? 1 : 3;
		}
		return 0;
	}
	if (mismaMarca !== null) return mismaMarca ? 1 : 0;
	if (!producto.claveMarca && !producto.claveModelo && v.claveModelo.length >= 3) {
		return compacto(producto.nombre).includes(v.claveModelo) ? 2 : null;
	}
	return null;
}

const porVehiculo = new Map();
for (const p of productos.values()) {
	if (!p.claveModelo) continue;
	const clave = `${p.claveMarca}|${p.claveModelo}`;
	if (!porVehiculo.has(clave)) porVehiculo.set(clave, []);
	porVehiculo.get(clave).push(p);
}

function productoPara(v, tipo) {
	const candidatos = porVehiculo.get(`${v.claveMarca}|${v.claveModelo}`) ?? [];
	return (
		candidatos.find((p) => p.tipo_pieza === tipo) ??
		candidatos.find((p) => p.tipo_pieza === 'escape_completo') ??
		candidatos[0] ??
		null
	);
}

const ETIQUETA_TIPO = {
	escape_completo: 'Escape completo',
	multiple: 'Múltiple',
	bajada: 'Bajada',
	downpipe: 'Downpipe',
	trombon: 'Trombón',
	silenciador: 'Silenciador',
	salida: 'Salida de escape',
	secundario: 'Secundario'
};
const nuevos = new Map();
const informe = { producto: [], desvincular: [], vincular: [], contacto: [] };
const cambios = [];
const usadas = new Set();

for (const u of unidades) {
	const fila = filaPorNumero.get(u.numero);
	if (!fila) continue;
	const v = vehiculo(fila);
	const cliente = texto(fila.CLIENTE);
	const fecha = fechaExcel(fila.FECHA);
	const nivel = texto(fila.CONFIANZA);
	const actual = productos.get(u.producto_id);
	let orden = u.orden_fabricacion_id ? ordenes.get(u.orden_fabricacion_id) : null;

	if (orden && nivel === 'MEDIA') {
		const items = orden.productos.map((id) => productos.get(id)).filter(Boolean);
		const conItems = items.length > 0 && (v.claveMarca || v.claveModelo);
		if (conItems && items.every((p) => encaja(v, p) === 0)) {
			informe.desvincular.push({
				'N° escape': u.numero,
				Fecha: fecha,
				Cliente: cliente,
				Escape: v.original,
				OF: orden.id,
				'Ítems de la OF': items.map((p) => p.nombre).join(' | ')
			});
			cambios.push({ tipo: 'desvincular', unidad: u, orden });
			orden = null;
		}
	}

	if (!u.orden_fabricacion_id && !u.pedido_id && fecha && (v.claveMarca || v.claveModelo)) {
		const candidatas = [...ordenes.values()].filter(
			(o) =>
				o.cliente &&
				o.fecha &&
				Math.min(diasEntre(o.fecha, fecha), diasEntre(o.fin ?? o.fecha, fecha)) <= DIAS &&
				mismoCliente(cliente, o.cliente) &&
				o.productos.some((id) => encaja(v, productos.get(id)) >= 3)
		);
		if (candidatas.length === 1) {
			const nuevaOrden = candidatas[0];
			const libre = (libres.get(nuevaOrden.id) ?? []).find((id) => !usadas.has(id));
			if (libre) usadas.add(libre);
			informe.vincular.push({
				'N° escape': u.numero,
				Fecha: fecha,
				Cliente: cliente,
				Escape: v.original,
				OF: nuevaOrden.id,
				'Cliente de la OF': nuevaOrden.cliente,
				'Fecha OF': nuevaOrden.fecha,
				'Ocupa unidad sin número': libre ? 'Sí' : 'No, se suma'
			});
			cambios.push({ tipo: 'vincular', unidad: u, orden: nuevaOrden, libre });
			orden = nuevaOrden;
		}
	}

	if (!u.contacto_id && !orden && !u.pedido_id && cliente) {
		const parecidos = contactos.filter((c) => mismoCliente(cliente, c.razon_social));
		if (parecidos.length === 1) {
			informe.contacto.push({
				'N° escape': u.numero,
				'Cliente en la lista': cliente,
				Contacto: parecidos[0].razon_social
			});
			cambios.push({ tipo: 'contacto', unidad: u, contactoId: parecidos[0].id });
		}
	}

	const items = orden ? orden.productos.map((id) => productos.get(id)).filter(Boolean) : [];
	const nivelActual = encaja(v, actual) ?? 0;
	if (nivelActual >= 3 || (!v.claveMarca && !v.claveModelo)) continue;
	const delItem = items
		.map((p) => ({ p, n: encaja(v, p) }))
		.filter((x) => x.n >= 3)
		.map((x) => x.p)[0];
	const propuesto = delItem ?? productoPara(v, actual?.tipo_pieza);
	if (propuesto && propuesto.id !== actual?.id && (encaja(v, propuesto) ?? 0) > nivelActual) {
		informe.producto.push({
			'N° escape': u.numero,
			Escape: v.original,
			'Corrección de marca/modelo': v.corregido ?? '',
			'Producto actual': actual?.nombre ?? '',
			'Producto propuesto': propuesto.nombre,
			Origen: delItem ? 'Ítem de su OF' : 'Producto del mismo vehículo'
		});
		cambios.push({ tipo: 'producto', unidad: u, productoId: propuesto.id });
	} else if (!propuesto && v.conocido) {
		const tipo = actual?.tipo_pieza ?? 'escape_completo';
		const clave = `${tipo}|${v.conocido.id}`;
		if (!nuevos.has(clave)) {
			nuevos.set(clave, {
				tipo,
				marcaId: v.conocido.marca_id,
				modeloId: v.conocido.id,
				nombre: `${ETIQUETA_TIPO[tipo] ?? 'Pieza'} ${v.conocido.marca} ${v.conocido.nombre}`,
				unidades: []
			});
		}
		nuevos.get(clave).unidades.push(u);
		informe.producto.push({
			'N° escape': u.numero,
			Escape: v.original,
			'Corrección de marca/modelo': v.corregido ?? '',
			'Producto actual': actual?.nombre ?? '',
			'Producto propuesto': `${nuevos.get(clave).nombre} (nuevo)`,
			Origen: 'Producto nuevo'
		});
	}
}

const resumen = {
	'Escapes con otro producto': cambios.filter((c) => c.tipo === 'producto').length,
	'Productos nuevos': nuevos.size,
	'Escapes a productos nuevos': [...nuevos.values()].reduce((t, n) => t + n.unidades.length, 0),
	'Desvincular de su OF': informe.desvincular.length,
	'Vincular a una OF': informe.vincular.length,
	'Vincular a un contacto': informe.contacto.length
};
console.table(resumen);

if (opciones.informe) {
	const libro = XLSX.utils.book_new();
	const agregar = (nombre, filas) =>
		XLSX.utils.book_append_sheet(
			libro,
			XLSX.utils.json_to_sheet(filas.length ? filas : [{ resultado: 'Sin casos' }]),
			nombre
		);
	agregar(
		'Resumen',
		Object.entries(resumen).map(([Concepto, Cantidad]) => ({ Concepto, Cantidad }))
	);
	agregar('Producto', informe.producto);
	agregar('Desvincular de OF', informe.desvincular);
	agregar('Vincular a OF', informe.vincular);
	agregar('Contacto', informe.contacto);
	XLSX.writeFile(libro, opciones.informe);
	console.log(`[escapes] Informe: ${opciones.informe}`);
}

if (!opciones.confirmar) {
	console.log('[escapes] Simulación: no se cambió nada. Agregá --confirmar para aplicar.');
	await pool.end();
	process.exit(0);
}

const cliente = await pool.connect();
try {
	await cliente.query('BEGIN');
	const [{ id: categoriaEscapes }] = (
		await cliente.query("SELECT id FROM categorias_productos WHERE slug = 'escapes'")
	).rows;
	let [{ ultimo }] = (
		await cliente.query(
			"SELECT coalesce(max(substring(codigo from '^H(\\d+)-')::int), 0) AS ultimo FROM productos"
		)
	).rows;
	for (const nuevo of nuevos.values()) {
		ultimo++;
		const [{ id }] = (
			await cliente.query(
				`INSERT INTO productos (codigo, nombre, categoria_id, tipo_pieza, marca_id, modelo_id,
					notas_fabricacion, historico)
				VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
				[
					`H${String(ultimo).padStart(4, '0')}-${compacto(nuevo.nombre).slice(0, 18)}`,
					nuevo.nombre.slice(0, 200),
					categoriaEscapes,
					nuevo.tipo,
					nuevo.marcaId,
					nuevo.modeloId,
					`Creado al revisar los escapes del histórico (${nuevo.unidades.length} escapes).`
				]
			)
		).rows;
		for (const unidad of nuevo.unidades) cambios.push({ tipo: 'producto', unidad, productoId: id });
	}
	for (const cambio of cambios) {
		const { unidad } = cambio;
		if (cambio.tipo === 'desvincular') {
			await cliente.query(
				`UPDATE unidades_fabricacion SET orden_fabricacion_id = NULL, numero_serie = $2,
					contacto_id = coalesce(contacto_id, $3),
					observaciones = concat_ws(E'\\n', observaciones, $4::text), updated_at = now() WHERE id = $1`,
				[
					unidad.id,
					`H-E${unidad.numero}`,
					cambio.orden.contacto_id,
					`Desvinculado de la OF ${cambio.orden.id}: el vehículo no coincide con sus ítems.`
				]
			);
		} else if (cambio.tipo === 'vincular') {
			await cliente.query(
				`UPDATE adjuntos SET unidad_fabricacion_id = NULL, orden_fabricacion_id = $2
				WHERE unidad_fabricacion_id = $1`,
				[unidad.id, cambio.orden.id]
			);
			if (cambio.libre) {
				const [{ producto_id, observaciones }] = (
					await cliente.query(
						'DELETE FROM unidades_fabricacion WHERE id = $1 RETURNING producto_id, observaciones',
						[unidad.id]
					)
				).rows;
				await cliente.query(
					`UPDATE unidades_fabricacion SET numero = $2, producto_id = coalesce(producto_id, $3),
						observaciones = concat_ws(E'\n', observaciones, $4::text), updated_at = now() WHERE id = $1`,
					[cambio.libre, unidad.numero, producto_id, observaciones]
				);
				unidad.id = cambio.libre;
			} else {
				await cliente.query(
					`UPDATE unidades_fabricacion SET orden_fabricacion_id = $2, numero_serie = $3,
						updated_at = now() WHERE id = $1`,
					[unidad.id, cambio.orden.id, `${cambio.orden.id}-E${unidad.numero}`]
				);
			}
		} else if (cambio.tipo === 'contacto') {
			await cliente.query('UPDATE unidades_fabricacion SET contacto_id = $2 WHERE id = $1', [
				unidad.id,
				cambio.contactoId
			]);
		} else if (cambio.tipo === 'producto') {
			await cliente.query(
				'UPDATE unidades_fabricacion SET producto_id = $2, updated_at = now() WHERE id = $1',
				[unidad.id, cambio.productoId]
			);
		}
	}
	await cliente.query(
		`UPDATE ordenes_fabricacion o SET cantidad_total = greatest(1, (
		SELECT count(*) FROM unidades_fabricacion u WHERE u.orden_fabricacion_id = o.id))
		WHERE o.id = ANY($1::int[])`,
		[[...new Set(cambios.filter((c) => c.orden).map((c) => c.orden.id))]]
	);
	await cliente.query('COMMIT');
	console.log('[escapes] Cambios aplicados.');
} catch (error) {
	await cliente.query('ROLLBACK');
	console.error(`[escapes] No se aplicó nada: ${error.message}`);
	process.exitCode = 1;
} finally {
	cliente.release();
	await pool.end();
}
